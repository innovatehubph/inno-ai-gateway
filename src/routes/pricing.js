const express = require('express');
const router = express.Router();
const pricingService = require('../services/pricing-service');
const { adminAuth } = require('./admin');
const customerService = require('../services/customer-service');

// Middleware to authenticate customers
const authenticateCustomer = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = customerService.verifyToken(token);
    req.customer = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * @route   GET /pricing
 * @desc    Get public pricing information
 * @access  Public
 */
router.get('/', (req, res) => {
  try {
    const pricing = pricingService.getPublicPricing();
    res.json({
      success: true,
      pricing: pricing
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route   GET /pricing/models/:modelId
 * @desc    Get pricing for a specific model
 * @access  Public
 */
router.get('/models/:modelId', (req, res) => {
  try {
    const { modelId } = req.params;
    const { tier = 'starter', currency } = req.query;
    
    const pricing = pricingService.getModelPricing(modelId, tier, currency);
    res.json({
      success: true,
      model: modelId,
      pricing: pricing
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route   POST /pricing/calculate
 * @desc    Calculate cost for a request (preview)
 * @access  Public
 */
router.post('/calculate', (req, res) => {
  try {
    const { model, inputTokens = 0, outputTokens = 0, tier = 'starter', currency } = req.body;
    
    if (!model) {
      return res.status(400).json({ error: 'Model is required' });
    }
    
    const cost = pricingService.calculateCost(model, inputTokens, outputTokens, tier, currency);
    res.json({
      success: true,
      cost: cost
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route   GET /pricing/all
 * @desc    Get complete pricing configuration (Admin only)
 * @access  Admin
 */
router.get('/all', adminAuth, (req, res) => {
  try {
    const pricing = pricingService.getAllPricing();
    res.json({
      success: true,
      pricing: pricing
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route   POST /pricing/custom
 * @desc    Set custom price for a model (Admin only)
 * @access  Admin
 */
router.post('/custom', adminAuth, (req, res) => {
  try {
    const { modelId, input, output } = req.body;
    
    if (!modelId || typeof input !== 'number' || typeof output !== 'number') {
      return res.status(400).json({ 
        error: 'modelId, input (number), and output (number) are required' 
      });
    }
    
    if (input < 0 || output < 0) {
      return res.status(400).json({ error: 'Prices cannot be negative' });
    }
    
    const success = pricingService.setCustomPrice(modelId, { input, output });
    
    if (success) {
      res.json({
        success: true,
        message: `Custom price set for ${modelId}`,
        pricing: { modelId, input, output }
      });
    } else {
      res.status(500).json({ error: 'Failed to set custom price' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route   DELETE /pricing/custom/:modelId
 * @desc    Remove custom price for a model (Admin only)
 * @access  Admin
 */
router.delete('/custom/:modelId', adminAuth, (req, res) => {
  try {
    const { modelId } = req.params;
    
    const success = pricingService.removeCustomPrice(modelId);
    
    if (success) {
      res.json({
        success: true,
        message: `Custom price removed for ${modelId}`
      });
    } else {
      res.status(500).json({ error: 'Failed to remove custom price' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route   PUT /pricing/tiers/:tierId
 * @desc    Update tier configuration (Admin only)
 * @access  Admin
 */
router.put('/tiers/:tierId', adminAuth, (req, res) => {
  try {
    const { tierId } = req.params;
    const updates = req.body;
    
    const success = pricingService.updateTier(tierId, updates);
    
    if (success) {
      res.json({
        success: true,
        message: `Tier ${tierId} updated`,
        tier: { id: tierId, ...updates }
      });
    } else {
      res.status(500).json({ error: 'Failed to update tier' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route   GET /pricing/my
 * @desc    Get pricing for authenticated customer's tier
 * @access  Customer
 */
router.get('/my', authenticateCustomer, (req, res) => {
  try {
    const customer = customerService.getCustomer(req.customer.customerId);
    const tier = customer.tier || 'starter';
    const currency = customer.currency || pricingService.config.defaultCurrency;
    
    // Get pricing for all models for this customer's tier
    const models = [
      'inno-ai-boyong-4.5',
      'inno-ai-boyong-4.0',
      'inno-ai-boyong-mini',
      'inno-ai-vision-xl',
      'inno-ai-voice-1',
      'inno-ai-whisper-1',
      'inno-ai-embed-1',
      'inno-ai-3d-gen',
      'inno-ai-3d-convert'
    ];
    
    const modelPricing = models.map(modelId => ({
      model: modelId,
      ...pricingService.getModelPricing(modelId, tier, currency)
    }));
    
    const tierConfig = pricingService.config.tiers[tier];
    
    res.json({
      success: true,
      customer: {
        id: req.customer.customerId,
        tier: tier,
        currency: currency
      },
      tier: tierConfig,
      models: modelPricing
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
