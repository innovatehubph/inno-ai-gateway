const express = require('express');
const router = express.Router();

// Import all route modules
const healthRoutes = require('./health');
const authRoutes = require('./auth');
const customerRoutes = require('./customers');
const billingRoutes = require('./billing');
const inferenceRoutes = require('./inference');
const adminRoutes = require('./admin');
const pricingRoutes = require('./pricing');
const subscriptionRoutes = require('./subscriptions');

// Import cost tracker middleware (separate concern)
const costTracker = require('../services/cost-tracker');

// Mount routes with their respective paths
router.use('/health', healthRoutes);
router.use('/api/customer/auth', authRoutes);
router.use('/api/v1/customers', customerRoutes);
router.use('/admin/billing', billingRoutes);

// Inference routes with cost tracking middleware
// Cost tracker runs independently of inference logic
router.use('/v1', costTracker.middleware(), inferenceRoutes);

router.use('/admin', adminRoutes);
router.use('/pricing', pricingRoutes);
router.use('/subscriptions', subscriptionRoutes);

module.exports = router;
