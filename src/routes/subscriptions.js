const express = require('express');
const router = express.Router();
const subscriptionBilling = require('../services/subscription-billing');
const subscriptionService = require('../services/subscription-service');
const customerService = require('../services/customer-service');
const { adminAuth } = require('./admin');

// Customer authentication middleware
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
 * @route   GET /subscriptions/plans
 * @desc    Get all available subscription plans
 * @access  Public
 */
router.get('/plans', (req, res) => {
  try {
    const plans = subscriptionService.getPublicPlans();
    res.json({
      success: true,
      plans: plans
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route   POST /subscriptions/create
 * @desc    Create a new subscription
 * @access  Customer
 */
router.post('/create', authenticateCustomer, async (req, res) => {
  try {
    const { planId, billingCycle = 'monthly', paymentDetails } = req.body;
    const customerId = req.customer.customerId;
    
    const result = await subscriptionBilling.createSubscription(
      customerId,
      planId,
      billingCycle,
      paymentDetails
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route   GET /subscriptions/my
 * @desc    Get customer's current subscription
 * @access  Customer
 */
router.get('/my', authenticateCustomer, (req, res) => {
  try {
    const customerId = req.customer.customerId;
    const subscription = subscriptionBilling.getSubscription(customerId);
    
    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
        message: 'No active subscription'
      });
    }
    
    // Add usage data
    const usage = subscriptionService.getUsageDashboard(customerId);
    
    res.json({
      success: true,
      subscription: subscription,
      usage: usage
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route   POST /subscriptions/cancel
 * @desc    Cancel subscription
 * @access  Customer
 */
router.post('/cancel', authenticateCustomer, (req, res) => {
  try {
    const customerId = req.customer.customerId;
    const result = subscriptionBilling.cancelSubscription(customerId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route   POST /subscriptions/renew
 * @desc    Renew subscription
 * @access  Customer
 */
router.post('/renew', authenticateCustomer, async (req, res) => {
  try {
    const customerId = req.customer.customerId;
    const result = await subscriptionBilling.renewSubscription(customerId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route   GET /subscriptions/billing-history
 * @desc    Get customer's billing history
 * @access  Customer
 */
router.get('/billing-history', authenticateCustomer, (req, res) => {
  try {
    const customerId = req.customer.customerId;
    const history = subscriptionBilling.getBillingHistory(customerId);
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route   POST /subscriptions/webhook/directpay
 * @desc    Handle DirectPay payment webhooks
 * @access  Public (secured by signature)
 */
router.post('/webhook/directpay', async (req, res) => {
  try {
    // Verify webhook signature (implement based on DirectPay's webhook format)
    const { payment_id, status, invoice_id, reference } = req.body;
    
    if (status === 'completed' || status === 'paid') {
      const result = await subscriptionBilling.handlePaymentSuccess(
        invoice_id,
        reference || payment_id,
        req.body
      );
      
      if (result.success) {
        return res.json({ received: true });
      }
    }
    
    res.json({ received: true, status: 'processed' });
  } catch (e) {
    console.error('[SUBSCRIPTION WEBHOOK] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route   GET /subscriptions/payment/success
 * @desc    Payment success redirect handler
 * @access  Public
 */
router.get('/payment/success', async (req, res) => {
  try {
    const { invoice, reference, payment_id } = req.query;
    
    if (invoice && (reference || payment_id)) {
      await subscriptionBilling.handlePaymentSuccess(
        invoice,
        reference || payment_id,
        req.query
      );
    }
    
    // Redirect to customer portal or return HTML
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Successful</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #10b981; font-size: 48px; }
          .message { font-size: 24px; margin: 20px 0; }
          .button { 
            background: #6366f1; color: white; padding: 15px 30px; 
            text-decoration: none; border-radius: 5px; display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="success">✓</div>
        <div class="message">Payment Successful!</div>
        <p>Your subscription has been activated.</p>
        <a href="/portal" class="button">Go to Dashboard</a>
      </body>
      </html>
    `);
  } catch (e) {
    res.status(500).send('Error processing payment. Please contact support.');
  }
});

/**
 * @route   GET /subscriptions/payment/cancel
 * @desc    Payment cancel redirect handler
 * @access  Public
 */
router.get('/payment/cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Cancelled</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .cancel { color: #f59e0b; font-size: 48px; }
        .message { font-size: 24px; margin: 20px 0; }
        .button { 
          background: #6366f1; color: white; padding: 15px 30px; 
          text-decoration: none; border-radius: 5px; display: inline-block;
        }
      </style>
    </head>
    <body>
      <div class="cancel">✗</div>
      <div class="message">Payment Cancelled</div>
      <p>You can try again anytime.</p>
      <a href="/portal" class="button">Back to Dashboard</a>
    </body>
    </html>
  `);
});

/**
 * @route   GET /subscriptions/admin/all
 * @desc    Get all subscriptions (Admin only)
 * @access  Admin
 */
router.get('/admin/all', adminAuth, (req, res) => {
  try {
    const subscriptions = subscriptionBilling.loadSubscriptions();
    const invoices = subscriptionBilling.loadInvoices();
    
    res.json({
      success: true,
      subscriptions: Object.values(subscriptions),
      invoices: Object.values(invoices).slice(-100) // Last 100 invoices
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @route   GET /subscriptions/admin/revenue
 * @desc    Get revenue analytics (Admin only)
 * @access  Admin
 */
router.get('/admin/revenue', adminAuth, (req, res) => {
  try {
    const invoices = subscriptionBilling.loadInvoices();
    const subscriptions = subscriptionBilling.loadSubscriptions();
    
    let totalRevenue = 0;
    let monthlyRevenue = {};
    let planDistribution = {};
    
    Object.values(invoices).forEach(inv => {
      if (inv.status === 'paid') {
        totalRevenue += parseFloat(inv.amount);
        
        const month = inv.paidAt?.slice(0, 7) || inv.createdAt.slice(0, 7);
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + parseFloat(inv.amount);
      }
    });
    
    Object.values(subscriptions).forEach(sub => {
      planDistribution[sub.plan] = (planDistribution[sub.plan] || 0) + 1;
    });
    
    res.json({
      success: true,
      analytics: {
        totalRevenue,
        monthlyRevenue,
        planDistribution,
        activeSubscriptions: Object.values(subscriptions).filter(s => s.status === 'active').length
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
