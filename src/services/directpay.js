/**
 * DirectPay Payment Gateway Integration
 * 
 * Supports:
 * - Sandbox and Production environments
 * - AES-256-CBC encryption for payment data
 * - Checkout session creation
 * - Webhook handling
 * - Transaction tracking
 * 
 * @author InnovateHub Inc.
 * @version 1.0.0
 */

const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Import customer service for tier upgrades
const customerService = require('./customer-service');

// Configuration paths
const CONFIG_DIR = path.join(__dirname, '..', '..', 'config');
const DIRECTPAY_CONFIG_FILE = path.join(CONFIG_DIR, 'directpay.json');
const TRANSACTIONS_FILE = path.join(CONFIG_DIR, 'transactions.json');

// Default sandbox credentials
const SANDBOX_DEFAULTS = {
  environment: 'sandbox',
  apiBase: 'https://sandbox.directpayph.com/api',
  dashboard: 'https://sandbox.directpayph.com',
  merchantId: 'TEST5VMFBNLCWJKD',
  merchantKey: 'KEYYS4A4OWZL4SV5',
  username: 'test_flsz2hnw',
  password: 'P8oGxu9k3zkxdrgQ',
  minAmount: 100,
  currency: 'PHP'
};

class DirectPayService {
  constructor() {
    this.config = this.loadConfig();
    this.ensureTransactionFile();
  }

  /**
   * Load DirectPay configuration
   */
  loadConfig() {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }

      if (fs.existsSync(DIRECTPAY_CONFIG_FILE)) {
        const data = JSON.parse(fs.readFileSync(DIRECTPAY_CONFIG_FILE, 'utf8'));
        // Ensure sandbox defaults are present
        return { ...SANDBOX_DEFAULTS, ...data };
      }

      // Create default config with sandbox credentials
      const defaultConfig = { ...SANDBOX_DEFAULTS };
      this.saveConfig(defaultConfig);
      return defaultConfig;
    } catch (e) {
      console.error('[DIRECTPAY] Error loading config:', e.message);
      return { ...SANDBOX_DEFAULTS };
    }
  }

  /**
   * Save DirectPay configuration
   */
  saveConfig(config) {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(DIRECTPAY_CONFIG_FILE, JSON.stringify(config, null, 2));
      // Set restrictive permissions
      fs.chmodSync(DIRECTPAY_CONFIG_FILE, 0o600);
      this.config = config;
      return true;
    } catch (e) {
      console.error('[DIRECTPAY] Error saving config:', e.message);
      return false;
    }
  }

  /**
   * Get current configuration (safe - excludes passwords/keys)
   */
  getPublicConfig() {
    return {
      environment: this.config.environment,
      apiBase: this.config.apiBase,
      dashboard: this.config.dashboard,
      merchantId: this.config.merchantId,
      minAmount: this.config.minAmount,
      currency: this.config.currency,
      hasProductionCredentials: !!(this.config.production?.merchantId && this.config.production?.merchantKey)
    };
  }

  /**
   * Set environment (sandbox/production)
   */
  setEnvironment(env) {
    if (env !== 'sandbox' && env !== 'production') {
      throw new Error('Environment must be "sandbox" or "production"');
    }

    const newConfig = { ...this.config, environment: env };
    
    if (env === 'sandbox') {
      // Revert to sandbox defaults
      newConfig.apiBase = SANDBOX_DEFAULTS.apiBase;
      newConfig.dashboard = SANDBOX_DEFAULTS.dashboard;
      newConfig.merchantId = SANDBOX_DEFAULTS.merchantId;
      newConfig.merchantKey = SANDBOX_DEFAULTS.merchantKey;
    } else if (env === 'production' && this.config.production) {
      // Switch to production credentials
      newConfig.apiBase = this.config.production.apiBase || 'https://api.directpayph.com/api';
      newConfig.dashboard = this.config.production.dashboard || 'https://dashboard.directpayph.com';
      newConfig.merchantId = this.config.production.merchantId;
      newConfig.merchantKey = this.config.production.merchantKey;
    }

    return this.saveConfig(newConfig);
  }

  /**
   * Save production credentials
   */
  setProductionCredentials(credentials) {
    const newConfig = {
      ...this.config,
      production: {
        apiBase: credentials.apiBase || 'https://api.directpayph.com/api',
        dashboard: credentials.dashboard || 'https://dashboard.directpayph.com',
        merchantId: credentials.merchantId,
        merchantKey: credentials.merchantKey,
        username: credentials.username,
        password: credentials.password
      }
    };

    // If currently in production mode, update active credentials too
    if (this.config.environment === 'production') {
      newConfig.apiBase = newConfig.production.apiBase;
      newConfig.dashboard = newConfig.production.dashboard;
      newConfig.merchantId = newConfig.production.merchantId;
      newConfig.merchantKey = newConfig.production.merchantKey;
    }

    return this.saveConfig(newConfig);
  }

  /**
   * Encrypt data using AES-256-CBC
   * Merchant ID (16 chars) = IV
   * Merchant Key (16 chars) = Key
   */
  encrypt(data) {
    try {
      const iv = Buffer.from(this.config.merchantId, 'utf8');
      const key = Buffer.from(this.config.merchantKey, 'utf8');
      
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      return encrypted;
    } catch (e) {
      console.error('[DIRECTPAY] Encryption error:', e.message);
      throw new Error('Failed to encrypt payment data');
    }
  }

  /**
   * Decrypt data using AES-256-CBC
   */
  decrypt(encryptedData) {
    try {
      const iv = Buffer.from(this.config.merchantId, 'utf8');
      const key = Buffer.from(this.config.merchantKey, 'utf8');
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (e) {
      console.error('[DIRECTPAY] Decryption error:', e.message);
      throw new Error('Failed to decrypt payment data');
    }
  }

  /**
   * Test connection to DirectPay API
   */
  async testConnection() {
    try {
      // Simple health check - try to get API info
      const response = await axios.get(`${this.config.apiBase}/health`, {
        timeout: 10000,
        validateStatus: () => true // Don't throw on non-2xx
      });

      return {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        environment: this.config.environment,
        message: response.status === 200 ? 'Connection successful' : `HTTP ${response.status}`
      };
    } catch (e) {
      return {
        success: false,
        error: e.message,
        environment: this.config.environment
      };
    }
  }

  /**
   * Create a checkout session
   */
  async createCheckout(params) {
    try {
      const {
        amount,
        description,
        metadata = {},
        successUrl,
        cancelUrl,
        webhookUrl
      } = params;

      // Validate minimum amount
      if (amount < this.config.minAmount) {
        throw new Error(`Minimum amount is ₱${this.config.minAmount}`);
      }

      // Prepare checkout data
      const checkoutData = {
        amount: parseFloat(amount).toFixed(2),
        currency: this.config.currency,
        description: description || 'AI Gateway Service',
        merchant_id: this.config.merchantId,
        metadata: {
          ...metadata,
          created_at: new Date().toISOString()
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        webhook_url: webhookUrl
      };

      // Encrypt sensitive data if required by DirectPay
      // Note: This depends on DirectPay's specific API requirements
      const payload = this.config.environment === 'production' 
        ? { encrypted: this.encrypt(checkoutData) }
        : checkoutData;

      // Make API request
      const response = await axios.post(
        `${this.config.apiBase}/checkout`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Merchant-ID': this.config.merchantId,
            'X-API-Key': this.config.merchantKey
          },
          timeout: 30000
        }
      );

      // Store transaction
      const transaction = {
        id: response.data.payment_id || response.data.id,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        description: checkoutData.description,
        status: 'pending',
        metadata: checkoutData.metadata,
        checkout_url: response.data.checkout_url,
        created_at: new Date().toISOString()
      };
      
      this.saveTransaction(transaction);

      return {
        success: true,
        paymentId: transaction.id,
        checkoutUrl: response.data.checkout_url,
        amount: checkoutData.amount,
        currency: checkoutData.currency
      };

    } catch (e) {
      console.error('[DIRECTPAY] Checkout error:', e.message);
      if (e.response) {
        console.error('[DIRECTPAY] Response:', e.response.data);
      }
      return {
        success: false,
        error: e.response?.data?.message || e.message
      };
    }
  }

  /**
   * Ensure transactions file exists
   */
  ensureTransactionFile() {
    try {
      if (!fs.existsSync(TRANSACTIONS_FILE)) {
        fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify({ transactions: [] }, null, 2));
        fs.chmodSync(TRANSACTIONS_FILE, 0o600);
      }
    } catch (e) {
      console.error('[DIRECTPAY] Error creating transactions file:', e.message);
    }
  }

  /**
   * Save transaction to file
   */
  saveTransaction(transaction) {
    try {
      const data = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
      data.transactions.unshift(transaction); // Add to beginning
      
      // Keep only last 1000 transactions
      if (data.transactions.length > 1000) {
        data.transactions = data.transactions.slice(0, 1000);
      }
      
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('[DIRECTPAY] Error saving transaction:', e.message);
    }
  }

  /**
   * Get all transactions
   */
  getTransactions(limit = 100, offset = 0) {
    try {
      const data = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
      return {
        transactions: data.transactions.slice(offset, offset + limit),
        total: data.transactions.length,
        limit,
        offset
      };
    } catch (e) {
      console.error('[DIRECTPAY] Error loading transactions:', e.message);
      return { transactions: [], total: 0, limit, offset };
    }
  }

  /**
   * Handle webhook from DirectPay
   */
  handleWebhook(payload) {
    try {
      console.log('[DIRECTPAY] Webhook received:', payload.event);
      
      const { event, data } = payload;
      
      // Load transactions
      const transactionsData = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
      
      // Find transaction
      const txIndex = transactionsData.transactions.findIndex(
        tx => tx.id === data.payment_id
      );
      
      if (txIndex === -1) {
        console.log('[DIRECTPAY] Transaction not found:', data.payment_id);
        return { success: false, error: 'Transaction not found' };
      }
      
      // Update transaction based on event
      switch (event) {
        case 'payment.success':
          transactionsData.transactions[txIndex].status = 'completed';
          transactionsData.transactions[txIndex].completed_at = new Date().toISOString();
          transactionsData.transactions[txIndex].payment_method = data.payment_method;
          
          // Upgrade customer tier for subscription payments
          const metadata = transactionsData.transactions[txIndex].metadata || {};
          if (metadata.type === 'subscription' && metadata.customerId && metadata.tier) {
            try {
              customerService.updateCustomerTier(metadata.customerId, metadata.tier);
              console.log(`[DIRECTPAY] Customer ${metadata.customerId} tier upgraded to ${metadata.tier}`);
            } catch (tierError) {
              console.error(`[DIRECTPAY] Failed to upgrade customer tier:`, tierError.message);
            }
          }
          break;
          
        case 'payment.failed':
          transactionsData.transactions[txIndex].status = 'failed';
          transactionsData.transactions[txIndex].failed_at = new Date().toISOString();
          transactionsData.transactions[txIndex].failure_reason = data.failure_reason;
          break;
          
        case 'payment.cancelled':
          transactionsData.transactions[txIndex].status = 'cancelled';
          transactionsData.transactions[txIndex].cancelled_at = new Date().toISOString();
          break;
          
        case 'payment.refunded':
          transactionsData.transactions[txIndex].status = 'refunded';
          transactionsData.transactions[txIndex].refunded_at = new Date().toISOString();
          transactionsData.transactions[txIndex].refund_amount = data.refund_amount;
          break;
          
        default:
          console.log('[DIRECTPAY] Unknown webhook event:', event);
          return { success: false, error: 'Unknown event type' };
      }
      
      // Save updated transactions
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactionsData, null, 2));
      
      console.log(`[DIRECTPAY] Transaction ${data.payment_id} updated: ${event}`);
      
      return {
        success: true,
        event,
        transactionId: data.payment_id,
        status: transactionsData.transactions[txIndex].status
      };
      
    } catch (e) {
      console.error('[DIRECTPAY] Webhook error:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Verify webhook signature (if DirectPay provides signature verification)
   */
  verifyWebhookSignature(payload, signature) {
    // Implementation depends on DirectPay's webhook security
    // This is a placeholder - adjust based on actual API
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.merchantKey)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return signature === expectedSignature;
    } catch (e) {
      console.error('[DIRECTPAY] Signature verification error:', e.message);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new DirectPayService();
