const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const customerService = require('../services/customer-service');
const pricingStrategy = require('../services/pricing-strategy');
const directpay = require('../services/directpay');

// Customer JWT middleware
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

// ==================== CUSTOMER API KEYS ====================

// Create API key
router.post('/api-keys', authenticateCustomer, async (req, res) => {
  try {
    const { name } = req.body;
    const result = await customerService.createApiKey(req.customer.customerId, name);
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// List API keys
router.get('/api-keys', authenticateCustomer, async (req, res) => {
  try {
    const apiKeys = customerService.getApiKeys(req.customer.customerId);
    res.json({ success: true, apiKeys });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Revoke API key
router.delete('/api-keys/:keyId', authenticateCustomer, async (req, res) => {
  try {
    const result = await customerService.revokeApiKey(req.customer.customerId, req.params.keyId);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==================== CUSTOMER USAGE & ANALYTICS ====================

// Get usage statistics
router.get('/usage', authenticateCustomer, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const usage = customerService.getUsage(req.customer.customerId, period);
    res.json({ success: true, usage });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ==================== PRICING & BILLING ====================

// Get customer billing info
router.get('/billing', authenticateCustomer, async (req, res) => {
  try {
    const usage = customerService.getUsage(req.customer.customerId, '30d');
    const customer = customerService.getCustomer(req.customer.customerId);
    
    res.json({
      success: true,
      billing: {
        tier: customer.tier,
        currentUsage: usage.totalCost,
        currency: 'PHP',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Subscribe to a pricing tier
router.post('/billing/subscribe', authenticateCustomer, async (req, res) => {
  try {
    const { tier } = req.body;
    
    // Validate tier
    const validTiers = ['starter', 'professional', 'enterprise'];
    if (!tier || !validTiers.includes(tier)) {
      return res.status(400).json({ 
        error: 'Invalid tier. Must be one of: starter, professional, enterprise' 
      });
    }
    
    // Get tier pricing
    const tierInfo = pricingStrategy.ourStrategy.subscriptionTiers[tier];
    if (!tierInfo || tierInfo.pricePHP === 0) {
      return res.status(400).json({ error: 'Invalid tier configuration' });
    }
    
    // Create checkout session
    const result = await directpay.createCheckout({
      amount: tierInfo.pricePHP,
      description: `Subscription - ${tierInfo.name} Plan`,
      metadata: {
        customerId: req.customer.customerId,
        tier: tier,
        type: 'subscription'
      },
      successUrl: 'https://ai-gateway.innoserver.cloud/portal?payment=success',
      cancelUrl: 'https://ai-gateway.innoserver.cloud/portal?payment=cancelled',
      webhookUrl: 'https://ai-gateway.innoserver.cloud/webhooks/directpay'
    });
    
    res.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      tier: tier,
      amount: tierInfo.pricePHP
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== PRICING INFORMATION ====================

// Get pricing information (public endpoint)
router.get('/pricing', (req, res) => {
  try {
    const { philippinePricing, subscriptionTiers, payAsYouGo } = pricingStrategy.ourStrategy;
    
    res.json({
      success: true,
      pricing: {
        models: philippinePricing,
        subscriptions: subscriptionTiers,
        payAsYouGo: payAsYouGo,
        currency: 'PHP'
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
