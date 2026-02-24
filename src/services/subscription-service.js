/**
 * Subscription Service
 * 
 * Handles subscription-based pricing with usage allowances and overages
 * Business Model: Monthly subscription + usage overage charges
 * 
 * @module subscription-service
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../config/paths');
const { loadSubscriptionConfig, BRANDED_MODELS, SUBSCRIPTION_PLANS } = require('../config/subscriptions');

const USAGE_FILE = path.join(DATA_DIR, 'subscription-usage.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');

class SubscriptionService {
  constructor() {
    this.config = loadSubscriptionConfig();
    this.plans = SUBSCRIPTION_PLANS;
    this.brandedModels = BRANDED_MODELS;
  }
  
  /**
   * Get customer subscription details
   */
  getCustomerSubscription(customerId) {
    try {
      const customers = this.loadCustomers();
      const customer = customers[customerId];
      
      if (!customer) {
        return null;
      }
      
      const planId = customer.plan || 'free';
      const plan = this.plans[planId];
      
      return {
        customerId,
        plan: planId,
        planName: plan.name,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        currency: plan.currency,
        allowances: plan.allowances,
        features: plan.features,
        models: plan.models,
        maxRequestsPerMinute: plan.maxRequestsPerMinute
      };
    } catch (e) {
      console.error('[SUBSCRIPTION] Error getting subscription:', e.message);
      return null;
    }
  }
  
  /**
   * Get current month's usage for a customer
   */
  getCurrentUsage(customerId) {
    try {
      let usageData = {};
      if (fs.existsSync(USAGE_FILE)) {
        usageData = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
      }
      
      const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      if (!usageData[customerId]) {
        usageData[customerId] = {};
      }
      
      if (!usageData[customerId][monthKey]) {
        usageData[customerId][monthKey] = {
          tokens: 0,
          images: 0,
          audioMinutes: 0,
          videoSeconds: 0,
          requests: 0,
          overages: {
            tokens: 0,
            images: 0,
            audioMinutes: 0,
            videoSeconds: 0
          },
          overageCost: 0
        };
      }
      
      return usageData[customerId][monthKey];
    } catch (e) {
      console.error('[SUBSCRIPTION] Error getting usage:', e.message);
      return {
        tokens: 0, images: 0, audioMinutes: 0, videoSeconds: 0, requests: 0,
        overages: { tokens: 0, images: 0, audioMinutes: 0, videoSeconds: 0 },
        overageCost: 0
      };
    }
  }
  
  /**
   * Check if customer has exceeded their allowance
   */
  checkAllowance(customerId, usageType, amount) {
    try {
      const subscription = this.getCustomerSubscription(customerId);
      const usage = this.getCurrentUsage(customerId);
      
      if (!subscription || !subscription.allowances) {
        return { allowed: false, reason: 'No subscription found' };
      }
      
      const allowance = subscription.allowances;
      const current = usage[usageType] || 0;
      const limit = allowance[usageType];
      
      // Check if unlimited (Enterprise)
      if (limit === Infinity) {
        return { allowed: true, remaining: Infinity };
      }
      
      const remaining = limit - current;
      const wouldExceed = (current + amount) > limit;
      
      return {
        allowed: true, // Allow but track overages
        wouldExceed,
        remaining,
        current,
        limit,
        overage: wouldExceed ? (current + amount - limit) : 0
      };
    } catch (e) {
      console.error('[SUBSCRIPTION] Error checking allowance:', e.message);
      return { allowed: true }; // Fail open
    }
  }
  
  /**
   * Record usage and calculate overages
   */
  recordUsage(customerId, request) {
    try {
      const { model, tokens, images, audioMinutes, videoSeconds } = request;
      
      // Determine usage type
      let usageType = 'tokens';
      let amount = tokens || 0;
      
      if (images) {
        usageType = 'images';
        amount = images;
      } else if (audioMinutes) {
        usageType = 'audioMinutes';
        amount = audioMinutes;
      } else if (videoSeconds) {
        usageType = 'videoSeconds';
        amount = videoSeconds;
      }
      
      // Load usage data
      let usageData = {};
      if (fs.existsSync(USAGE_FILE)) {
        usageData = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
      }
      
      const monthKey = new Date().toISOString().slice(0, 7);
      
      if (!usageData[customerId]) {
        usageData[customerId] = {};
      }
      
      if (!usageData[customerId][monthKey]) {
        usageData[customerId][monthKey] = {
          tokens: 0,
          images: 0,
          audioMinutes: 0,
          videoSeconds: 0,
          requests: 0,
          overages: {
            tokens: 0,
            images: 0,
            audioMinutes: 0,
            videoSeconds: 0
          },
          overageCost: 0,
          providerCosts: 0,
          requestLog: []
        };
      }
      
      const usage = usageData[customerId][monthKey];
      const subscription = this.getCustomerSubscription(customerId);
      const plan = this.plans[subscription.plan] || this.plans.free;
      
      // Check allowance
      const allowance = subscription.allowances;
      const limit = allowance[usageType];
      
      let overage = 0;
      let withinAllowance = amount;
      
      if (limit !== Infinity) {
        const current = usage[usageType] || 0;
        const projected = current + amount;
        
        if (projected > limit) {
          withinAllowance = Math.max(0, limit - current);
          overage = projected - limit;
        }
      }
      
      // Update usage
      usage[usageType] = (usage[usageType] || 0) + amount;
      usage.requests = (usage.requests || 0) + 1;
      
      // Calculate overage cost
      if (overage > 0) {
        usage.overages[usageType] = (usage.overages[usageType] || 0) + overage;
        
        // Calculate cost based on usage type
        let overageRate = 0;
        if (usageType === 'tokens') {
          overageRate = plan.overageRates.tokensPer1K / 1000; // per token
        } else {
          overageRate = plan.overageRates[usageType] || 0;
        }
        
        const overageCost = overage * overageRate;
        usage.overageCost = (usage.overageCost || 0) + overageCost;
      }
      
      // Calculate provider cost
      const providerCost = this.calculateProviderCost(model, tokens, images, audioMinutes, videoSeconds);
      usage.providerCosts = (usage.providerCosts || 0) + providerCost;
      
      // Log request
      usage.requestLog.push({
        timestamp: new Date().toISOString(),
        model,
        [usageType]: amount,
        overage,
        withinAllowance
      });
      
      // Keep only last 1000 requests to prevent file bloat
      if (usage.requestLog.length > 1000) {
        usage.requestLog = usage.requestLog.slice(-1000);
      }
      
      // Save usage data
      fs.writeFileSync(USAGE_FILE, JSON.stringify(usageData, null, 2));
      
      return {
        recorded: true,
        usageType,
        amount,
        withinAllowance,
        overage,
        overageCost: overage > 0 ? usage.overageCost : 0,
        totalUsage: usage[usageType],
        allowance: limit,
        remaining: limit !== Infinity ? Math.max(0, limit - usage[usageType]) : Infinity
      };
    } catch (e) {
      console.error('[SUBSCRIPTION] Error recording usage:', e.message);
      return { recorded: false, error: e.message };
    }
  }
  
  /**
   * Calculate provider cost for a request
   */
  calculateProviderCost(modelId, tokens = 0, images = 0, audioMinutes = 0, videoSeconds = 0) {
    try {
      const mapping = this.brandedModels[modelId];
      if (!mapping) return 0;
      
      const providerConfig = this.config.providerModels[mapping.provider];
      if (!providerConfig) return 0;
      
      const modelConfig = providerConfig.models[mapping.model];
      if (!modelConfig) return 0;
      
      let cost = 0;
      
      if (modelConfig.cost.input && modelConfig.cost.output && tokens) {
        // Assume 50/50 input/output split if not specified
        const inputTokens = Math.floor(tokens / 2);
        const outputTokens = tokens - inputTokens;
        cost = (inputTokens / 1000) * modelConfig.cost.input + 
               (outputTokens / 1000) * modelConfig.cost.output;
      }
      
      if (modelConfig.cost.perImage && images) {
        cost += images * modelConfig.cost.perImage;
      }
      
      if (modelConfig.cost.perMinute && audioMinutes) {
        cost += audioMinutes * modelConfig.cost.perMinute;
      }
      
      if (modelConfig.cost.perSecond && videoSeconds) {
        cost += videoSeconds * modelConfig.cost.perSecond;
      }
      
      // Add infrastructure cost for HuggingFace
      if (mapping.provider === 'huggingface' && providerConfig.infrastructureCost) {
        cost += providerConfig.infrastructureCost.perRequest;
        if (tokens) {
          cost += tokens * providerConfig.infrastructureCost.perToken;
        }
      }
      
      return cost;
    } catch (e) {
      console.error('[SUBSCRIPTION] Error calculating provider cost:', e.message);
      return 0;
    }
  }
  
  /**
   * Get usage dashboard for customer
   */
  getUsageDashboard(customerId) {
    try {
      const subscription = this.getCustomerSubscription(customerId);
      const usage = this.getCurrentUsage(customerId);
      
      if (!subscription) {
        return { error: 'No subscription found' };
      }
      
      const allowance = subscription.allowances;
      const monthKey = new Date().toISOString().slice(0, 7);
      
      const dashboard = {
        customerId,
        month: monthKey,
        plan: subscription.plan,
        planName: subscription.planName,
        subscription: {
          monthlyPrice: subscription.monthlyPrice,
          currency: subscription.currency
        },
        usage: {
          tokens: {
            used: usage.tokens,
            allowance: allowance.tokensPerMonth,
            percentage: allowance.tokensPerMonth !== Infinity 
              ? Math.round((usage.tokens / allowance.tokensPerMonth) * 100)
              : null,
            remaining: allowance.tokensPerMonth !== Infinity
              ? Math.max(0, allowance.tokensPerMonth - usage.tokens)
              : Infinity
          },
          images: {
            used: usage.images,
            allowance: allowance.imagesPerMonth,
            percentage: allowance.imagesPerMonth !== Infinity
              ? Math.round((usage.images / allowance.imagesPerMonth) * 100)
              : null,
            remaining: allowance.imagesPerMonth !== Infinity
              ? Math.max(0, allowance.imagesPerMonth - usage.images)
              : Infinity
          },
          audio: {
            used: usage.audioMinutes,
            allowance: allowance.audioMinutesPerMonth,
            percentage: allowance.audioMinutesPerMonth !== Infinity
              ? Math.round((usage.audioMinutes / allowance.audioMinutesPerMonth) * 100)
              : null,
            remaining: allowance.audioMinutesPerMonth !== Infinity
              ? Math.max(0, allowance.audioMinutesPerMonth - usage.audioMinutes)
              : Infinity
          },
          video: {
            used: usage.videoSeconds,
            allowance: allowance.videoSecondsPerMonth,
            percentage: allowance.videoSecondsPerMonth !== Infinity
              ? Math.round((usage.videoSeconds / allowance.videoSecondsPerMonth) * 100)
              : null,
            remaining: allowance.videoSecondsPerMonth !== Infinity
              ? Math.max(0, allowance.videoSecondsPerMonth - usage.videoSeconds)
              : Infinity
          }
        },
        overages: usage.overages,
        overageCost: usage.overageCost,
        providerCosts: usage.providerCosts,
        estimatedProfit: subscription.monthlyPrice - (usage.providerCosts || 0) - (usage.overageCost || 0)
      };
      
      return dashboard;
    } catch (e) {
      console.error('[SUBSCRIPTION] Error getting dashboard:', e.message);
      return { error: e.message };
    }
  }
  
  /**
   * Upgrade/downgrade customer plan
   */
  changePlan(customerId, newPlanId) {
    try {
      if (!this.plans[newPlanId]) {
        return { success: false, error: 'Invalid plan' };
      }
      
      const customers = this.loadCustomers();
      if (!customers[customerId]) {
        return { success: false, error: 'Customer not found' };
      }
      
      const oldPlan = customers[customerId].plan || 'free';
      customers[customerId].plan = newPlanId;
      customers[customerId].planChangedAt = new Date().toISOString();
      customers[customerId].previousPlan = oldPlan;
      
      this.saveCustomers(customers);
      
      return {
        success: true,
        customerId,
        oldPlan,
        newPlan: newPlanId,
        message: `Plan changed from ${oldPlan} to ${newPlanId}`
      };
    } catch (e) {
      console.error('[SUBSCRIPTION] Error changing plan:', e.message);
      return { success: false, error: e.message };
    }
  }
  
  /**
   * Load customers data
   */
  loadCustomers() {
    try {
      if (fs.existsSync(CUSTOMERS_FILE)) {
        return JSON.parse(fs.readFileSync(CUSTOMERS_FILE, 'utf8'));
      }
      return {};
    } catch (e) {
      console.error('[SUBSCRIPTION] Error loading customers:', e.message);
      return {};
    }
  }
  
  /**
   * Save customers data
   */
  saveCustomers(customers) {
    try {
      fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(customers, null, 2));
      return true;
    } catch (e) {
      console.error('[SUBSCRIPTION] Error saving customers:', e.message);
      return false;
    }
  }
  
  /**
   * Get all available plans for public display
   */
  getPublicPlans() {
    return Object.entries(this.plans).map(([id, plan]) => ({
      id,
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      currency: plan.currency,
      features: plan.features,
      allowances: {
        tokensPerMonth: plan.allowances.tokensPerMonth,
        imagesPerMonth: plan.allowances.imagesPerMonth,
        audioMinutesPerMonth: plan.allowances.audioMinutesPerMonth,
        videoSecondsPerMonth: plan.allowances.videoSecondsPerMonth
      },
      overageRates: plan.overageRates,
      maxRequestsPerMinute: plan.maxRequestsPerMinute
    }));
  }
}

// Export singleton instance
module.exports = new SubscriptionService();
