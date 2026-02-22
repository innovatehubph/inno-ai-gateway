const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const customerService = require('../services/customer-service');

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

// Customer registration
router.post('/register', async (req, res) => {
  try {
    const result = await customerService.registerCustomer(req.body);
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Customer login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await customerService.loginCustomer(email, password);
    res.json(result);
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

// Get customer profile
router.get('/profile', authenticateCustomer, async (req, res) => {
  try {
    const customer = customerService.getCustomer(req.customer.customerId);
    res.json({ success: true, customer });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Update customer profile
router.put('/profile', authenticateCustomer, async (req, res) => {
  try {
    const result = await customerService.updateCustomer(req.customer.customerId, req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Change password
router.post('/change-password', authenticateCustomer, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await customerService.changePassword(req.customer.customerId, currentPassword, newPassword);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
