/**
 * Cost Tracking Middleware
 * 
 * Separates cost tracking from inference logic
 * Uses event-driven pattern for loose coupling
 * 
 * @module cost-tracker
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../config/paths');
const pricingService = require('./pricing-service');
const customerService = require('./customer-service');
const { loadApiKeys } = require('../utils/data-helpers');

class CostTracker {
  constructor() {
    this.costLogFile = path.join(DATA_DIR, 'cost-log.jsonl');
    this.usageFile = path.join(DATA_DIR, 'customer-usage.json');
    this.eventQueue = [];
    this.processingInterval = null;
    this.startProcessing();
  }
  
  /**
   * Start background processing of cost events
   */
  startProcessing() {
    // Process queue every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 5000);
  }
  
  /**
   * Stop background processing
   */
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
  
  /**
   * Queue a cost tracking event
   * @param {Object} event - Cost event
   */
  track(event) {
    this.eventQueue.push({
      ...event,
      queuedAt: new Date().toISOString()
    });
  }
  
  /**
   * Process queued events
   */
  async processQueue() {
    if (this.eventQueue.length === 0) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    for (const event of events) {
      try {
        await this.processEvent(event);
      } catch (e) {
        console.error('[COST-TRACKER] Error processing event:', e.message);
        // Re-queue failed events (max 3 retries)
        if ((event.retries || 0) < 3) {
          this.eventQueue.push({
            ...event,
            retries: (event.retries || 0) + 1
          });
        }
      }
    }
  }
  
  /**
   * Process a single cost event
   */
  async processEvent(event) {
    const { apiKey, model, usage, requestId, timestamp } = event;
    
    // Get customer info
    const apiKeys = loadApiKeys();
    const keyData = apiKeys.keys[apiKey];
    
    if (!keyData?.customerId) {
      console.log(`[COST-TRACKER] No customer for API key`);
      return;
    }
    
    const customer = customerService.getCustomer(keyData.customerId);
    const tier = customer?.tier || 'starter';
    const currency = customer?.currency || pricingService.config.defaultCurrency;
    
    // Calculate cost
    const cost = pricingService.calculateCost(
      model,
      usage.prompt_tokens || 0,
      usage.completion_tokens || 0,
      tier,
      currency
    );
    
    // Log cost event
    const logEntry = {
      timestamp: timestamp || new Date().toISOString(),
      requestId,
      apiKey: apiKey.substring(0, 8) + '...',
      customerId: keyData.customerId,
      model,
      tier,
      currency,
      usage,
      cost: cost.totalCost,
      breakdown: cost.breakdown
    };
    
    fs.appendFileSync(this.costLogFile, JSON.stringify(logEntry) + '\n');
    
    // Update customer usage
    await this.updateCustomerUsage(keyData.customerId, usage, cost);
    
    console.log(`[COST-TRACKER] Tracked: ${model} - ${cost.symbol}${cost.totalCost.toFixed(4)}`);
  }
  
  /**
   * Update customer usage statistics
   */
  async updateCustomerUsage(customerId, usage, cost) {
    let usageData = {};
    
    if (fs.existsSync(this.usageFile)) {
      usageData = JSON.parse(fs.readFileSync(this.usageFile, 'utf8'));
    }
    
    if (!usageData[customerId]) {
      usageData[customerId] = {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        monthlyUsage: {}
      };
    }
    
    const monthKey = new Date().toISOString().slice(0, 7);
    if (!usageData[customerId].monthlyUsage[monthKey]) {
      usageData[customerId].monthlyUsage[monthKey] = {
        requests: 0,
        tokens: 0,
        cost: 0
      };
    }
    
    usageData[customerId].totalRequests++;
    usageData[customerId].totalTokens += (usage.total_tokens || 0);
    usageData[customerId].totalCost += cost.totalCost;
    usageData[customerId].monthlyUsage[monthKey].requests++;
    usageData[customerId].monthlyUsage[monthKey].tokens += (usage.total_tokens || 0);
    usageData[customerId].monthlyUsage[monthKey].cost += cost.totalCost;
    usageData[customerId].lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(this.usageFile, JSON.stringify(usageData, null, 2));
  }
  
  /**
   * Express middleware for cost tracking
   */
  middleware() {
    return (req, res, next) => {
      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json method to capture response
      res.json = (data) => {
        // Check if this is a chat completion response
        if (data && data.object === 'chat.completion' && req.apiKey && data.usage) {
          // Queue cost tracking event
          this.track({
            apiKey: req.apiKey,
            model: data.model,
            usage: data.usage,
            requestId: data.id?.replace('chatcmpl-', '') || 'unknown',
            timestamp: new Date().toISOString()
          });
        }
        
        // Call original json method
        return originalJson(data);
      };
      
      next();
    };
  }
}

// Export singleton instance
module.exports = new CostTracker();
