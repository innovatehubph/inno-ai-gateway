const express = require('express');
const router = express.Router();

// Import all route modules
const healthRoutes = require('./health');
const authRoutes = require('./auth');
const customerRoutes = require('./customers');
const billingRoutes = require('./billing');
const inferenceRoutes = require('./inference');
const adminRoutes = require('./admin');

// Mount routes with their respective paths
router.use('/health', healthRoutes);
router.use('/api/customer/auth', authRoutes);
router.use('/api/v1/customers', customerRoutes);
router.use('/admin/billing', billingRoutes);
router.use('/v1', inferenceRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
