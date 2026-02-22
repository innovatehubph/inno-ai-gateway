/**
 * Customer Authentication & Management Service
 * 
 * Features:
 * - JWT-based authentication
 * - Customer registration/login
 * - API key management
 * - Usage tracking
 * - Subscription management
 * 
 * @author InnovateHub Inc.
 * @version 1.0.0
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Configuration
const CONFIG_DIR = path.join(__dirname, '..', '..', 'config');
const CUSTOMERS_FILE = path.join(CONFIG_DIR, 'customers.json');
const API_KEYS_FILE = path.join(CONFIG_DIR, 'customer-api-keys.json');
const USAGE_FILE = path.join(CONFIG_DIR, 'customer-usage.json');

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'innovatehub-customer-jwt-secret-2026';
const JWT_EXPIRY = '7d';

class CustomerService {
  constructor() {
    this.ensureDataFiles();
  }

  /**
   * Ensure all data files exist
   */
  ensureDataFiles() {
    const files = [CUSTOMERS_FILE, API_KEYS_FILE, USAGE_FILE];
    files.forEach(file => {
      if (!fs.existsSync(file)) {
        const defaultData = file.includes('usage') 
          ? { usage: [] }
          : { data: [] };
        fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
        fs.chmodSync(file, 0o600);
      }
    });
  }

  // ==================== CUSTOMER MANAGEMENT ====================

  /**
   * Register new customer
   */
  async registerCustomer(customerData) {
    const { email, password, name, company = '', tier = 'free' } = customerData;

    // Validation
    if (!email || !password || !name) {
      throw new Error('Email, password, and name are required');
    }

    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const customers = this.loadCustomers();

    // Check if email exists
    if (customers.data.find(c => c.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email already registered');
    }

    // Create customer
    const customer = {
      id: 'cust_' + crypto.randomBytes(8).toString('hex'),
      email: email.toLowerCase(),
      name,
      company,
      tier,
      status: 'active',
      passwordHash: this.hashPassword(password),
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      loginCount: 0,
      settings: {
        notifications: true,
        newsletter: true
      }
    };

    customers.data.push(customer);
    this.saveCustomers(customers);

    // Create default API key
    await this.createApiKey(customer.id, 'Default Key');

    // Initialize usage tracking
    this.initializeUsage(customer.id);

    return {
      success: true,
      customer: this.sanitizeCustomer(customer),
      message: 'Registration successful. Please check your email to verify.'
    };
  }

  /**
   * Customer login
   */
  async loginCustomer(email, password) {
    const customers = this.loadCustomers();
    const customer = customers.data.find(
      c => c.email.toLowerCase() === email.toLowerCase()
    );

    if (!customer) {
      throw new Error('Invalid email or password');
    }

    if (customer.status !== 'active') {
      throw new Error('Account is suspended. Please contact support.');
    }

    if (!this.verifyPassword(password, customer.passwordHash)) {
      throw new Error('Invalid email or password');
    }

    // Update login stats
    customer.lastLogin = new Date().toISOString();
    customer.loginCount++;
    customer.updatedAt = new Date().toISOString();
    this.saveCustomers(customers);

    // Generate JWT
    const token = this.generateToken(customer);

    return {
      success: true,
      token,
      customer: this.sanitizeCustomer(customer),
      expiresIn: JWT_EXPIRY
    };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (e) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get customer by ID
   */
  getCustomer(customerId) {
    const customers = this.loadCustomers();
    const customer = customers.data.find(c => c.id === customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    return this.sanitizeCustomer(customer);
  }

  /**
   * Update customer tier (subscription upgrade)
   */
  updateCustomerTier(customerId, tier) {
    const customers = this.loadCustomers();
    const index = customers.data.findIndex(c => c.id === customerId);

    if (index === -1) {
      throw new Error('Customer not found');
    }

    // Update tier
    customers.data[index].tier = tier;
    
    // Initialize or update subscription object
    if (!customers.data[index].subscription) {
      customers.data[index].subscription = {};
    }
    
    customers.data[index].subscription.tier = tier;
    customers.data[index].subscription.updatedAt = new Date().toISOString();
    customers.data[index].subscription.status = 'active';
    
    // Update customer timestamp
    customers.data[index].updatedAt = new Date().toISOString();
    
    this.saveCustomers(customers);

    return {
      success: true,
      customer: this.sanitizeCustomer(customers.data[index]),
      message: `Customer tier upgraded to ${tier}`
    };
  }

  /**
   * Update customer
   */
  updateCustomer(customerId, updates) {
    const customers = this.loadCustomers();
    const index = customers.data.findIndex(c => c.id === customerId);

    if (index === -1) {
      throw new Error('Customer not found');
    }

    const allowedUpdates = ['name', 'company', 'settings'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        customers.data[index][field] = updates[field];
      }
    });

    customers.data[index].updatedAt = new Date().toISOString();
    this.saveCustomers(customers);

    return {
      success: true,
      customer: this.sanitizeCustomer(customers.data[index])
    };
  }

  /**
   * Change password
   */
  changePassword(customerId, currentPassword, newPassword) {
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }

    const customers = this.loadCustomers();
    const index = customers.data.findIndex(c => c.id === customerId);

    if (index === -1) {
      throw new Error('Customer not found');
    }

    if (!this.verifyPassword(currentPassword, customers.data[index].passwordHash)) {
      throw new Error('Current password is incorrect');
    }

    customers.data[index].passwordHash = this.hashPassword(newPassword);
    customers.data[index].updatedAt = new Date().toISOString();
    this.saveCustomers(customers);

    return { success: true, message: 'Password updated successfully' };
  }

  // ==================== API KEY MANAGEMENT ====================

  /**
   * Create API key for customer
   */
  createApiKey(customerId, name = 'API Key') {
    const apiKeys = this.loadApiKeys();
    
    const key = 'ik_' + crypto.randomBytes(24).toString('base64url');
    const apiKey = {
      id: 'key_' + crypto.randomBytes(8).toString('hex'),
      customerId,
      name,
      key,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      usageCount: 0,
      status: 'active',
      expiresAt: null
    };

    apiKeys.data.push(apiKey);
    this.saveApiKeys(apiKeys);

    return {
      success: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key, // Only shown once
        createdAt: apiKey.createdAt,
        status: apiKey.status
      },
      message: 'API key created. Copy it now - it won\'t be shown again!'
    };
  }

  /**
   * Get API keys for customer
   */
  getApiKeys(customerId) {
    const apiKeys = this.loadApiKeys();
    return apiKeys.data
      .filter(k => k.customerId === customerId)
      .map(k => ({
        id: k.id,
        name: k.name,
        createdAt: k.createdAt,
        lastUsed: k.lastUsed,
        usageCount: k.usageCount,
        status: k.status,
        expiresAt: k.expiresAt
      }));
  }

  /**
   * Revoke API key
   */
  revokeApiKey(customerId, keyId) {
    const apiKeys = this.loadApiKeys();
    const index = apiKeys.data.findIndex(
      k => k.id === keyId && k.customerId === customerId
    );

    if (index === -1) {
      throw new Error('API key not found');
    }

    apiKeys.data[index].status = 'revoked';
    this.saveApiKeys(apiKeys);

    return { success: true, message: 'API key revoked' };
  }

  /**
   * Validate API key
   */
  validateApiKey(key) {
    const apiKeys = this.loadApiKeys();
    const apiKey = apiKeys.data.find(k => k.key === key && k.status === 'active');

    if (!apiKey) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return null;
    }

    // Update usage
    apiKey.lastUsed = new Date().toISOString();
    apiKey.usageCount++;
    this.saveApiKeys(apiKeys);

    return this.getCustomer(apiKey.customerId);
  }

  // ==================== USAGE TRACKING ====================

  /**
   * Initialize usage tracking for customer
   */
  initializeUsage(customerId) {
    const usage = this.loadUsage();
    
    if (!usage.usage.find(u => u.customerId === customerId)) {
      usage.usage.push({
        customerId,
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        requestsByModel: {},
        dailyUsage: {},
        monthlyUsage: {},
        lastReset: new Date().toISOString()
      });
      this.saveUsage(usage);
    }
  }

  /**
   * Track API usage
   */
  trackUsage(customerId, model, tokens, cost) {
    const usage = this.loadUsage();
    const customerUsage = usage.usage.find(u => u.customerId === customerId);

    if (!customerUsage) {
      this.initializeUsage(customerId);
      return this.trackUsage(customerId, model, tokens, cost);
    }

    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Update totals
    customerUsage.totalRequests++;
    customerUsage.totalTokens += tokens || 0;
    customerUsage.totalCost += cost || 0;

    // Update model stats
    if (!customerUsage.requestsByModel[model]) {
      customerUsage.requestsByModel[model] = { requests: 0, tokens: 0, cost: 0 };
    }
    customerUsage.requestsByModel[model].requests++;
    customerUsage.requestsByModel[model].tokens += tokens || 0;
    customerUsage.requestsByModel[model].cost += cost || 0;

    // Update daily stats
    if (!customerUsage.dailyUsage[dateKey]) {
      customerUsage.dailyUsage[dateKey] = { requests: 0, tokens: 0, cost: 0 };
    }
    customerUsage.dailyUsage[dateKey].requests++;
    customerUsage.dailyUsage[dateKey].tokens += tokens || 0;
    customerUsage.dailyUsage[dateKey].cost += cost || 0;

    // Update monthly stats
    if (!customerUsage.monthlyUsage[monthKey]) {
      customerUsage.monthlyUsage[monthKey] = { requests: 0, tokens: 0, cost: 0 };
    }
    customerUsage.monthlyUsage[monthKey].requests++;
    customerUsage.monthlyUsage[monthKey].tokens += tokens || 0;
    customerUsage.monthlyUsage[monthKey].cost += cost || 0;

    this.saveUsage(usage);
  }

  /**
   * Get customer usage
   */
  getUsage(customerId, period = '30d') {
    const usage = this.loadUsage();
    const customerUsage = usage.usage.find(u => u.customerId === customerId);

    if (!customerUsage) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        requestsByModel: {},
        recentDaily: []
      };
    }

    // Calculate recent daily usage
    const days = parseInt(period);
    const recentDaily = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      recentDaily.push({
        date: dateKey,
        ...customerUsage.dailyUsage[dateKey] || { requests: 0, tokens: 0, cost: 0 }
      });
    }

    return {
      totalRequests: customerUsage.totalRequests,
      totalTokens: customerUsage.totalTokens,
      totalCost: customerUsage.totalCost,
      requestsByModel: customerUsage.requestsByModel,
      recentDaily
    };
  }

  // ==================== HELPER METHODS ====================

  generateToken(customer) {
    return jwt.sign(
      {
        customerId: customer.id,
        email: customer.email,
        tier: customer.tier
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
  }

  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password, hash) {
    const [salt, key] = hash.split(':');
    const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return key === derivedKey;
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  sanitizeCustomer(customer) {
    const { passwordHash, ...sanitized } = customer;
    return sanitized;
  }

  loadCustomers() {
    return JSON.parse(fs.readFileSync(CUSTOMERS_FILE, 'utf8'));
  }

  saveCustomers(customers) {
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(customers, null, 2));
  }

  loadApiKeys() {
    return JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
  }

  saveApiKeys(apiKeys) {
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
  }

  loadUsage() {
    return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
  }

  saveUsage(usage) {
    fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2));
  }
}

// Export singleton
module.exports = new CustomerService();
