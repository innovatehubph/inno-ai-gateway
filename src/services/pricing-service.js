/**
 * Pricing Management System
 * 
 * Allows setting custom prices for models with markup over provider costs
 * Supports multiple currencies and pricing tiers
 * 
 * @module pricing-service
 */

const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '..', '..', 'config');
const PRICING_CONFIG_FILE = path.join(CONFIG_DIR, 'pricing.json');

// Default pricing configuration
const DEFAULT_PRICING = {
  version: '1.0.0',
  defaultCurrency: 'PHP',
  defaultMarkupPercent: 50, // 50% markup over cost
  
  // Provider cost rates (approximate, in USD)
  providerCosts: {
    'openrouter': {
      'anthropic/claude-3-opus': { input: 0.015, output: 0.075 }, // per 1K tokens
      'anthropic/claude-3-sonnet': { input: 0.003, output: 0.015 },
      'anthropic/claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'openai/gpt-4o': { input: 0.005, output: 0.015 },
      'openai/gpt-4-turbo': { input: 0.01, output: 0.03 },
      'default': { input: 0.005, output: 0.015 }
    },
    'huggingface': {
      'default': { input: 0.000, output: 0.000 } // Free tier
    },
    'moonshotai': {
      'default': { input: 0.003, output: 0.009 }
    },
    'replicate': {
      'image': { perImage: 0.002 },
      'video': { perSecond: 0.01 },
      '3d': { perModel: 0.05 }
    }
  },
  
  // Custom pricing overrides (if null, uses markup calculation)
  customPrices: {},
  
  // Pricing tiers for customers
  tiers: {
    'free': {
      name: 'Free',
      description: 'Free tier with limited usage',
      markupPercent: 0, // No markup (cost price)
      features: ['basic_models', 'community_support'],
      limits: {
        requestsPerDay: 100,
        tokensPerMonth: 10000,
        maxConcurrent: 1
      }
    },
    'starter': {
      name: 'Starter',
      description: 'For individual developers',
      markupPercent: 30, // 30% markup
      features: ['all_models', 'email_support', 'analytics'],
      limits: {
        requestsPerDay: 1000,
        tokensPerMonth: 100000,
        maxConcurrent: 5
      }
    },
    'pro': {
      name: 'Pro',
      description: 'For small teams',
      markupPercent: 25, // 25% markup
      features: ['all_models', 'priority_support', 'analytics', 'webhooks'],
      limits: {
        requestsPerDay: 10000,
        tokensPerMonth: 1000000,
        maxConcurrent: 20
      }
    },
    'enterprise': {
      name: 'Enterprise',
      description: 'For large organizations',
      markupPercent: 20, // 20% markup (volume discount)
      features: ['all_models', 'dedicated_support', 'analytics', 'webhooks', 'sla', 'custom_models'],
      limits: {
        requestsPerDay: 100000,
        tokensPerMonth: 10000000,
        maxConcurrent: 100
      }
    }
  },
  
  // Currency conversion rates (relative to USD)
  currencies: {
    'USD': { rate: 1.0, symbol: '$', name: 'US Dollar' },
    'PHP': { rate: 56.5, symbol: '₱', name: 'Philippine Peso' }
  }
};

class PricingService {
  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }
  
  /**
   * Load pricing configuration
   */
  loadConfig() {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      
      if (fs.existsSync(PRICING_CONFIG_FILE)) {
        const data = JSON.parse(fs.readFileSync(PRICING_CONFIG_FILE, 'utf8'));
        // Merge with defaults to ensure all fields exist
        return this.mergeWithDefaults(data);
      }
      
      // Create default config
      this.saveConfig(DEFAULT_PRICING);
      return DEFAULT_PRICING;
    } catch (e) {
      console.error('[PRICING] Error loading config:', e.message);
      return DEFAULT_PRICING;
    }
  }
  
  /**
   * Merge loaded config with defaults
   */
  mergeWithDefaults(loaded) {
    return {
      ...DEFAULT_PRICING,
      ...loaded,
      providerCosts: { ...DEFAULT_PRICING.providerCosts, ...loaded.providerCosts },
      customPrices: { ...loaded.customPrices },
      tiers: { ...DEFAULT_PRICING.tiers, ...loaded.tiers },
      currencies: { ...DEFAULT_PRICING.currencies, ...loaded.currencies }
    };
  }
  
  /**
   * Save pricing configuration
   */
  saveConfig(config) {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(PRICING_CONFIG_FILE, JSON.stringify(config, null, 2));
      fs.chmodSync(PRICING_CONFIG_FILE, 0o600);
      this.config = config;
      return true;
    } catch (e) {
      console.error('[PRICING] Error saving config:', e.message);
      return false;
    }
  }
  
  /**
   * Validate configuration
   */
  validateConfig() {
    // Ensure all required fields exist
    if (!this.config.defaultMarkupPercent) {
      this.config.defaultMarkupPercent = 50;
    }
    if (!this.config.currencies) {
      this.config.currencies = DEFAULT_PRICING.currencies;
    }
    if (!this.config.tiers) {
      this.config.tiers = DEFAULT_PRICING.tiers;
    }
  }
  
  /**
   * Get pricing for a specific model
   * @param {string} modelId - Model identifier (e.g., 'inno-ai-boyong-4.5')
   * @param {string} tier - Customer tier (e.g., 'starter', 'pro')
   * @param {string} currency - Currency code (e.g., 'PHP', 'USD')
   * @returns {Object} Pricing details
   */
  getModelPricing(modelId, tier = 'starter', currency = null) {
    try {
      // Get tier configuration
      const tierConfig = this.config.tiers[tier] || this.config.tiers['starter'];
      const targetCurrency = currency || this.config.defaultCurrency;
      const currencyConfig = this.config.currencies[targetCurrency];
      
      if (!currencyConfig) {
        throw new Error(`Unsupported currency: ${targetCurrency}`);
      }
      
      // Check for custom price override
      if (this.config.customPrices[modelId]) {
        const customPrice = this.config.customPrices[modelId];
        return {
          model: modelId,
          tier: tier,
          currency: targetCurrency,
          symbol: currencyConfig.symbol,
          pricing: {
            input: this.convertCurrency(customPrice.input, 'USD', targetCurrency),
            output: this.convertCurrency(customPrice.output, 'USD', targetCurrency),
            isCustom: true
          },
          markupPercent: tierConfig.markupPercent
        };
      }
      
      // Calculate price based on provider cost + markup
      const providerCost = this.getProviderCost(modelId);
      const markupMultiplier = 1 + (tierConfig.markupPercent / 100);
      
      return {
        model: modelId,
        tier: tier,
        currency: targetCurrency,
        symbol: currencyConfig.symbol,
        pricing: {
          input: this.convertCurrency(providerCost.input * markupMultiplier, 'USD', targetCurrency),
          output: this.convertCurrency(providerCost.output * markupMultiplier, 'USD', targetCurrency),
          providerCost: {
            input: providerCost.input,
            output: providerCost.output
          },
          markupPercent: tierConfig.markupPercent,
          isCustom: false
        }
      };
    } catch (e) {
      console.error(`[PRICING] Error getting pricing for ${modelId}:`, e.message);
      // Return safe defaults
      return {
        model: modelId,
        tier: tier,
        currency: currency || 'USD',
        symbol: '$',
        pricing: { input: 0.01, output: 0.03 },
        error: e.message
      };
    }
  }
  
  /**
   * Get provider cost for a model
   * @param {string} modelId - Model identifier
   * @returns {Object} Provider cost rates
   */
  getProviderCost(modelId) {
    // Map branded models to provider models
    const modelMappings = {
      'inno-ai-boyong-4.5': { provider: 'openrouter', model: 'anthropic/claude-3-opus' },
      'inno-ai-boyong-4.0': { provider: 'openrouter', model: 'anthropic/claude-3-sonnet' },
      'inno-ai-boyong-mini': { provider: 'openrouter', model: 'anthropic/claude-3-haiku' }
    };
    
    const mapping = modelMappings[modelId];
    if (mapping) {
      const providerCosts = this.config.providerCosts[mapping.provider];
      if (providerCosts && providerCosts[mapping.model]) {
        return providerCosts[mapping.model];
      }
      if (providerCosts && providerCosts['default']) {
        return providerCosts['default'];
      }
    }
    
    // Default costs
    return { input: 0.005, output: 0.015 };
  }
  
  /**
   * Convert currency
   * @param {number} amount - Amount in USD
   * @param {string} from - From currency (default USD)
   * @param {string} to - To currency
   * @returns {number} Converted amount
   */
  convertCurrency(amount, from = 'USD', to) {
    try {
      if (from === to) return amount;
      
      const fromRate = this.config.currencies[from]?.rate || 1;
      const toRate = this.config.currencies[to]?.rate || 1;
      
      // Convert to USD first, then to target
      const inUSD = amount / fromRate;
      return inUSD * toRate;
    } catch (e) {
      console.error('[PRICING] Currency conversion error:', e.message);
      return amount;
    }
  }
  
  /**
   * Calculate cost for a request
   * @param {string} modelId - Model used
   * @param {number} inputTokens - Input token count
   * @param {number} outputTokens - Output token count
   * @param {string} tier - Customer tier
   * @param {string} currency - Currency code
   * @returns {Object} Cost breakdown
   */
  calculateCost(modelId, inputTokens, outputTokens, tier = 'starter', currency = null) {
    try {
      const pricing = this.getModelPricing(modelId, tier, currency);
      const inputCost = (inputTokens / 1000) * pricing.pricing.input;
      const outputCost = (outputTokens / 1000) * pricing.pricing.output;
      const totalCost = inputCost + outputCost;
      
      return {
        model: modelId,
        tier: tier,
        currency: pricing.currency,
        symbol: pricing.symbol,
        breakdown: {
          inputTokens: inputTokens,
          inputCost: inputCost,
          outputTokens: outputTokens,
          outputCost: outputCost
        },
        totalCost: totalCost,
        rates: {
          inputPer1K: pricing.pricing.input,
          outputPer1K: pricing.pricing.output
        }
      };
    } catch (e) {
      console.error('[PRICING] Cost calculation error:', e.message);
      return {
        model: modelId,
        tier: tier,
        totalCost: 0,
        error: e.message
      };
    }
  }
  
  /**
   * Set custom price for a model
   * @param {string} modelId - Model identifier
   * @param {Object} prices - { input: number, output: number } in USD
   */
  setCustomPrice(modelId, prices) {
    try {
      this.config.customPrices[modelId] = {
        input: prices.input,
        output: prices.output,
        updatedAt: new Date().toISOString()
      };
      return this.saveConfig(this.config);
    } catch (e) {
      console.error('[PRICING] Error setting custom price:', e.message);
      return false;
    }
  }
  
  /**
   * Remove custom price for a model
   * @param {string} modelId - Model identifier
   */
  removeCustomPrice(modelId) {
    try {
      delete this.config.customPrices[modelId];
      return this.saveConfig(this.config);
    } catch (e) {
      console.error('[PRICING] Error removing custom price:', e.message);
      return false;
    }
  }
  
  /**
   * Update tier configuration
   * @param {string} tierId - Tier identifier
   * @param {Object} config - Tier configuration
   */
  updateTier(tierId, config) {
    try {
      if (!this.config.tiers[tierId]) {
        this.config.tiers[tierId] = {};
      }
      this.config.tiers[tierId] = {
        ...this.config.tiers[tierId],
        ...config,
        updatedAt: new Date().toISOString()
      };
      return this.saveConfig(this.config);
    } catch (e) {
      console.error('[PRICING] Error updating tier:', e.message);
      return false;
    }
  }
  
  /**
   * Get all pricing information
   * @returns {Object} Complete pricing config
   */
  getAllPricing() {
    return {
      defaultCurrency: this.config.defaultCurrency,
      defaultMarkupPercent: this.config.defaultMarkupPercent,
      currencies: this.config.currencies,
      tiers: this.config.tiers,
      customPrices: this.config.customPrices
    };
  }
  
  /**
   * Get public pricing (safe to expose to customers)
   * @returns {Object} Public pricing info
   */
  getPublicPricing() {
    const allPricing = this.getAllPricing();
    return {
      currencies: allPricing.currencies,
      tiers: Object.entries(allPricing.tiers).map(([id, tier]) => ({
        id: id,
        name: tier.name,
        description: tier.description,
        markupPercent: tier.markupPercent,
        features: tier.features,
        limits: tier.limits
      }))
    };
  }
}

// Export singleton instance
module.exports = new PricingService();
