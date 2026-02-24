/**
 * DirectPay Payment Gateway Integration - V2
 * 
 * Updated API endpoints based on official documentation:
 * 1. Get CSRF token
 * 2. Login
 * 3. Create cash-in transaction
 * 4. Check status
 * 
 * @module directpay-v2
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

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
    this.csrfToken = null;
    this.authToken = null;
  }
  
  loadConfig() {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      
      if (fs.existsSync(DIRECTPAY_CONFIG_FILE)) {
        const data = JSON.parse(fs.readFileSync(DIRECTPAY_CONFIG_FILE, 'utf8'));
        return { ...SANDBOX_DEFAULTS, ...data };
      }
      
      const defaultConfig = { ...SANDBOX_DEFAULTS };
      this.saveConfig(defaultConfig);
      return defaultConfig;
    } catch (e) {
      console.error('[DIRECTPAY] Error loading config:', e.message);
      return { ...SANDBOX_DEFAULTS };
    }
  }
  
  saveConfig(config) {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(DIRECTPAY_CONFIG_FILE, JSON.stringify(config, null, 2));
      fs.chmodSync(DIRECTPAY_CONFIG_FILE, 0o600);
      this.config = config;
      return true;
    } catch (e) {
      console.error('[DIRECTPAY] Error saving config:', e.message);
      return false;
    }
  }
  
  /**
   * Step 1: Get CSRF Token
   */
  async getCsrfToken() {
    try {
      console.log('[DIRECTPAY] Getting CSRF token...');
      
      const response = await axios.get(
        `${this.config.apiBase}/csrf_token`,
        { timeout: 10000 }
      );
      
      this.csrfToken = response.data.csrf_token;
      console.log('[DIRECTPAY] CSRF token received');
      
      return {
        success: true,
        csrfToken: this.csrfToken
      };
    } catch (e) {
      console.error('[DIRECTPAY] Error getting CSRF token:', e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  
  /**
   * Step 2: Login
   */
  async login() {
    try {
      // Get CSRF token first if not available
      if (!this.csrfToken) {
        const csrfResult = await this.getCsrfToken();
        if (!csrfResult.success) {
          return csrfResult;
        }
      }
      
      console.log('[DIRECTPAY] Logging in...');
      
      const response = await axios.post(
        `${this.config.apiBase}/create/login`,
        {
          username: this.config.username,
          password: this.config.password
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': this.csrfToken
          },
          timeout: 10000
        }
      );
      
      // DirectPay returns token in response.data.data.token
      this.authToken = response.data.data?.token || response.data.token || response.data.access_token;
      console.log('[DIRECTPAY] Login successful, token received');
      
      return {
        success: true,
        token: this.authToken,
        user: response.data.data?.username || response.data.user
      };
    } catch (e) {
      console.error('[DIRECTPAY] Login error:', e.message);
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
   * Step 3: Create Cash-in Transaction
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
      
      // Ensure we're logged in
      if (!this.authToken) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          return loginResult;
        }
      }
      
      console.log('[DIRECTPAY] Creating cash-in transaction...');
      
      const transactionData = {
        amount: parseFloat(amount),
        webhook: webhookUrl || 'https://ai-gateway.innoserver.cloud/webhooks/directpay',
        redirectUrl: successUrl || 'https://ai-gateway.innoserver.cloud/payment/success',
        merchantpaymentreferences: metadata.invoiceId || `INV-${Date.now()}`
      };
      
      const response = await axios.post(
        `${this.config.apiBase}/pay_cashin`,
        transactionData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          timeout: 30000
        }
      );
      
      console.log('[DIRECTPAY] Transaction created:', response.data);
      
      // Extract transaction details from DirectPay response
      const responseData = response.data.data || response.data;
      
      // Store transaction
      const transaction = {
        id: responseData.transactionId || responseData.transaction_id || responseData.id,
        amount: amount,
        currency: this.config.currency,
        description: description || 'AI Gateway Subscription',
        status: 'pending',
        metadata: metadata,
        checkout_url: responseData.redirectionurl || responseData.link || responseData.payment_url || responseData.checkout_url,
        reference: responseData.merchantpaymentreferences || transactionData.merchantpaymentreferences,
        created_at: new Date().toISOString()
      };
      
      this.saveTransaction(transaction);
      
      return {
        success: true,
        paymentId: transaction.id,
        reference: transaction.reference,
        checkoutUrl: transaction.checkout_url,
        amount: amount,
        currency: this.config.currency,
        transaction: response.data
      };
      
    } catch (e) {
      console.error('[DIRECTPAY] Create checkout error:', e.message);
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
   * Step 4: Check Transaction Status
   */
  async checkTransactionStatus(transactionId) {
    try {
      if (!this.authToken) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          return loginResult;
        }
      }
      
      console.log(`[DIRECTPAY] Checking status for ${transactionId}...`);
      
      const response = await axios.get(
        `${this.config.apiBase}/cashin_transactions_status/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          },
          timeout: 10000
        }
      );
      
      return {
        success: true,
        status: response.data
      };
    } catch (e) {
      console.error('[DIRECTPAY] Status check error:', e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  
  /**
   * Step 5: Get User Info/Balance
   */
  async getUserInfo() {
    try {
      if (!this.authToken) {
        const loginResult = await this.login();
        if (!loginResult.success) {
          return loginResult;
        }
      }
      
      console.log('[DIRECTPAY] Getting user info...');
      
      const response = await axios.get(
        `${this.config.apiBase}/user/info`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          },
          timeout: 10000
        }
      );
      
      return {
        success: true,
        info: response.data
      };
    } catch (e) {
      console.error('[DIRECTPAY] Get user info error:', e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  
  /**
   * Full flow: Create checkout with auto-login
   */
  async createCheckoutWithAuth(params) {
    // Step 1: Get CSRF (done in login)
    // Step 2: Login
    const loginResult = await this.login();
    if (!loginResult.success) {
      return loginResult;
    }
    
    // Step 3: Create transaction
    return this.createCheckout(params);
  }
  
  // Transaction file operations
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
  
  saveTransaction(transaction) {
    try {
      const data = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
      data.transactions.unshift(transaction);
      
      if (data.transactions.length > 1000) {
        data.transactions = data.transactions.slice(0, 1000);
      }
      
      fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('[DIRECTPAY] Error saving transaction:', e.message);
    }
  }
  
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
}

// Export singleton instance
module.exports = new DirectPayService();
