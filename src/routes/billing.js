const express = require('express');
const router = express.Router();
const directpay = require('../services/directpay');

// Admin authentication middleware
function adminAuth(req, res, next) {
  const ADMIN_KEY = process.env.ADMIN_KEY || 'inno-admin-2026';
  const authHeader = req.headers.authorization;
  const adminKey = req.headers['x-admin-key'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
  
  if (adminKey === ADMIN_KEY) return next();
  res.status(401).json({ error: 'Unauthorized', message: 'Invalid admin key' });
}

// Get DirectPay configuration
router.get('/config', adminAuth, (req, res) => {
  try {
    res.json({
      success: true,
      config: directpay.getPublicConfig()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Set environment (sandbox/production)
router.post('/environment', adminAuth, (req, res) => {
  try {
    const { environment } = req.body;
    
    if (!environment || !['sandbox', 'production'].includes(environment)) {
      return res.status(400).json({ error: 'Environment must be "sandbox" or "production"' });
    }
    
    directpay.setEnvironment(environment);
    
    res.json({
      success: true,
      message: `Environment set to ${environment}`,
      config: directpay.getPublicConfig()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Save production credentials
router.post('/credentials', adminAuth, (req, res) => {
  try {
    const { merchantId, merchantKey, apiBase, dashboard, username, password } = req.body;
    
    if (!merchantId || !merchantKey) {
      return res.status(400).json({ error: 'merchantId and merchantKey are required' });
    }
    
    directpay.setProductionCredentials({
      merchantId,
      merchantKey,
      apiBase: apiBase || 'https://api.directpayph.com/api',
      dashboard: dashboard || 'https://dashboard.directpayph.com',
      username,
      password
    });
    
    res.json({
      success: true,
      message: 'Production credentials saved',
      config: directpay.getPublicConfig()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Test DirectPay connection
router.post('/test', adminAuth, async (req, res) => {
  try {
    const result = await directpay.testConnection();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create payment/checkout
router.post('/payment', adminAuth, async (req, res) => {
  try {
    const { amount, description, metadata } = req.body;
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    const result = await directpay.createCheckout({
      amount: parseFloat(amount),
      description: description || 'AI Gateway Service',
      metadata: metadata || {},
      successUrl: `${req.protocol}://${req.get('host')}/admin/billing/success`,
      cancelUrl: `${req.protocol}://${req.get('host')}/admin/billing/cancel`,
      webhookUrl: `${req.protocol}://${req.get('host')}/webhooks/directpay`
    });
    
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get transactions
router.get('/transactions', adminAuth, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const result = directpay.getTransactions(limit, offset);
    res.json({
      success: true,
      ...result
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Billing success page
router.get('/success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Successful</title>
      <style>
        body { font-family: Arial, sans-serif; background: #0f0f23; color: #e0e0e0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .container { background: #1a1a2e; border: 1px solid #333; border-radius: 10px; padding: 40px; text-align: center; max-width: 400px; }
        .success { color: #81c784; font-size: 60px; margin-bottom: 20px; }
        h1 { color: #4fc3f7; margin-bottom: 10px; }
        p { color: #888; margin-bottom: 30px; }
        .btn { display: inline-block; background: #4285f4; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success">✓</div>
        <h1>Payment Successful!</h1>
        <p>Your payment has been processed successfully. You can close this window and return to the admin dashboard.</p>
        <a href="/admin" class="btn">Return to Dashboard</a>
      </div>
    </body>
    </html>
  `);
});

// Billing cancel page
router.get('/cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Cancelled</title>
      <style>
        body { font-family: Arial, sans-serif; background: #0f0f23; color: #e0e0e0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .container { background: #1a1a2e; border: 1px solid #333; border-radius: 10px; padding: 40px; text-align: center; max-width: 400px; }
        .cancel { color: #ffb74d; font-size: 60px; margin-bottom: 20px; }
        h1 { color: #ef5350; margin-bottom: 10px; }
        p { color: #888; margin-bottom: 30px; }
        .btn { display: inline-block; background: #4285f4; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="cancel">✕</div>
        <h1>Payment Cancelled</h1>
        <p>Your payment was cancelled. You can try again anytime from the admin dashboard.</p>
        <a href="/admin" class="btn">Return to Dashboard</a>
      </div>
    </body>
    </html>
  `);
});

module.exports = router;
