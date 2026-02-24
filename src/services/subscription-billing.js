/**
 * Subscription Billing Service
 * 
 * Integrates subscription management with DirectPay payment gateway
 * Handles local Philippine payment methods (GCash, PayMaya, bank transfer)
 * 
 * @module subscription-billing
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../config/paths');
const subscriptionService = require('./subscription-service');

const BILLING_DIR = path.join(DATA_DIR, 'billing');
const INVOICES_FILE = path.join(BILLING_DIR, 'invoices.json');
const SUBSCRIPTIONS_FILE = path.join(BILLING_DIR, 'subscriptions.json');

// Ensure billing directory exists
if (!fs.existsSync(BILLING_DIR)) {
  fs.mkdirSync(BILLING_DIR, { recursive: true });
}

class SubscriptionBillingService {
  constructor() {
    // DirectPay will be loaded when needed to avoid circular dependencies
    this._directpay = null;
  }
  
  /**
   * Lazy load DirectPay to avoid circular dependencies
   */
  get directpay() {
    if (!this._directpay) {
      this._directpay = require('./directpay');
    }
    return this._directpay;
  }
  
  /**
   * Create a subscription for a customer
   * @param {string} customerId - Customer ID
   * @param {string} planId - Plan ID (free, starter, pro, business)
   * @param {string} billingCycle - 'monthly' or 'yearly'
   * @param {Object} paymentDetails - DirectPay payment details
   */
  async createSubscription(customerId, planId, billingCycle = 'monthly', paymentDetails = {}) {
    try {
      const plan = subscriptionService.plans[planId];
      if (!plan) {
        return { success: false, error: 'Invalid plan' };
      }
      
      // Check if free plan
      if (planId === 'free') {
        return this.activateFreePlan(customerId);
      }
      
      // Calculate amount
      const amount = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
      const currency = plan.currency || 'PHP';
      
      if (!amount || amount <= 0) {
        return { success: false, error: 'Invalid plan price' };
      }
      
      // Create invoice
      const invoice = await this.createInvoice(customerId, planId, billingCycle, amount, currency);
      
      // Create DirectPay checkout session
      const checkout = await this.createDirectPayCheckout(invoice, paymentDetails);
      
      if (!checkout.success) {
        return { success: false, error: 'Failed to create checkout', details: checkout.error };
      }
      
      return {
        success: true,
        invoiceId: invoice.id,
        checkoutUrl: checkout.checkoutUrl,
        amount: amount,
        currency: currency,
        message: 'Please complete payment to activate subscription'
      };
    } catch (e) {
      console.error('[BILLING] Error creating subscription:', e.message);
      return { success: false, error: e.message };
    }
  }
  
  /**
   * Activate free plan
   */
  activateFreePlan(customerId) {
    try {
      const subscriptions = this.loadSubscriptions();
      
      subscriptions[customerId] = {
        customerId,
        plan: 'free',
        status: 'active',
        billingCycle: 'monthly',
        startedAt: new Date().toISOString(),
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: this.getPeriodEnd('monthly'),
        amount: 0,
        currency: 'PHP',
        paymentMethod: null,
        autoRenew: false
      };
      
      this.saveSubscriptions(subscriptions);
      
      // Update customer record
      this.updateCustomerPlan(customerId, 'free');
      
      return {
        success: true,
        plan: 'free',
        message: 'Free plan activated'
      };
    } catch (e) {
      console.error('[BILLING] Error activating free plan:', e.message);
      return { success: false, error: e.message };
    }
  }
  
  /**
   * Create invoice for subscription
   */
  async createInvoice(customerId, planId, billingCycle, amount, currency) {
    try {
      const invoices = this.loadInvoices();
      const invoiceId = `INV-${Date.now()}-${customerId.substring(0, 8)}`;
      
      const invoice = {
        id: invoiceId,
        customerId,
        planId,
        billingCycle,
        amount,
        currency,
        status: 'pending', // pending, paid, failed, cancelled
        createdAt: new Date().toISOString(),
        paidAt: null,
        directpayReference: null,
        description: `InnoAI Gateway ${planId} Plan - ${billingCycle}`,
        items: [
          {
            description: `${planId} Subscription (${billingCycle})`,
            amount: amount,
            currency: currency
          }
        ]
      };
      
      invoices[invoiceId] = invoice;
      this.saveInvoices(invoices);
      
      return invoice;
    } catch (e) {
      console.error('[BILLING] Error creating invoice:', e.message);
      throw e;
    }
  }
  
  /**
   * Create DirectPay checkout session
   */
  async createDirectPayCheckout(invoice, paymentDetails) {
    try {
      // Use DirectPay to create checkout
      const checkoutData = {
        amount: invoice.amount,
        currency: invoice.currency,
        description: invoice.description,
        metadata: {
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          planId: invoice.planId,
          billingCycle: invoice.billingCycle
        },
        successUrl: paymentDetails.successUrl || `https://ai-gateway.innoserver.cloud/portal/payment/success?invoice=${invoice.id}`,
        cancelUrl: paymentDetails.cancelUrl || `https://ai-gateway.innoserver.cloud/portal/payment/cancel?invoice=${invoice.id}`,
        customer: {
          email: paymentDetails.email,
          name: paymentDetails.name,
          phone: paymentDetails.phone
        }
      };
      
      // Call DirectPay checkout method
      const checkout = await this.directpay.createCheckout(checkoutData);
      
      if (checkout.success) {
        // Update invoice with DirectPay reference
        const invoices = this.loadInvoices();
        if (invoices[invoice.id]) {
          invoices[invoice.id].directpayReference = checkout.reference;
          invoices[invoice.id].checkoutUrl = checkout.checkoutUrl;
          this.saveInvoices(invoices);
        }
      }
      
      return checkout;
    } catch (e) {
      console.error('[BILLING] Error creating DirectPay checkout:', e.message);
      return { success: false, error: e.message };
    }
  }
  
  /**
   * Handle DirectPay webhook/payment success
   */
  async handlePaymentSuccess(invoiceId, directpayReference, paymentDetails) {
    try {
      const invoices = this.loadInvoices();
      const invoice = invoices[invoiceId];
      
      if (!invoice) {
        return { success: false, error: 'Invoice not found' };
      }
      
      if (invoice.status === 'paid') {
        return { success: true, message: 'Invoice already paid' };
      }
      
      // Update invoice
      invoice.status = 'paid';
      invoice.paidAt = new Date().toISOString();
      invoice.directpayReference = directpayReference;
      invoice.paymentDetails = paymentDetails;
      
      this.saveInvoices(invoices);
      
      // Activate subscription
      const activation = await this.activateSubscription(
        invoice.customerId,
        invoice.planId,
        invoice.billingCycle,
        invoice.amount,
        invoice.currency,
        directpayReference
      );
      
      return {
        success: true,
        invoiceId,
        subscription: activation,
        message: 'Payment successful, subscription activated'
      };
    } catch (e) {
      console.error('[BILLING] Error handling payment success:', e.message);
      return { success: false, error: e.message };
    }
  }
  
  /**
   * Activate subscription after payment
   */
  async activateSubscription(customerId, planId, billingCycle, amount, currency, paymentReference) {
    try {
      const subscriptions = this.loadSubscriptions();
      const now = new Date();
      
      subscriptions[customerId] = {
        customerId,
        plan: planId,
        status: 'active',
        billingCycle,
        startedAt: now.toISOString(),
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: this.getPeriodEnd(billingCycle),
        amount,
        currency,
        paymentMethod: 'directpay',
        paymentReference,
        autoRenew: true, // For now, manual renewal
        lastPaymentAt: now.toISOString(),
        nextBillingDate: this.getPeriodEnd(billingCycle)
      };
      
      this.saveSubscriptions(subscriptions);
      
      // Update customer record
      this.updateCustomerPlan(customerId, planId);
      
      return {
        success: true,
        customerId,
        plan: planId,
        status: 'active',
        validUntil: this.getPeriodEnd(billingCycle)
      };
    } catch (e) {
      console.error('[BILLING] Error activating subscription:', e.message);
      return { success: false, error: e.message };
    }
  }
  
  /**
   * Check if customer has active subscription
   */
  hasActiveSubscription(customerId) {
    try {
      const subscriptions = this.loadSubscriptions();
      const sub = subscriptions[customerId];
      
      if (!sub) return false;
      if (sub.status !== 'active') return false;
      
      // Check if subscription period is still valid
      const now = new Date();
      const periodEnd = new Date(sub.currentPeriodEnd);
      
      return now <= periodEnd;
    } catch (e) {
      console.error('[BILLING] Error checking subscription:', e.message);
      return false;
    }
  }
  
  /**
   * Get subscription details
   */
  getSubscription(customerId) {
    try {
      const subscriptions = this.loadSubscriptions();
      return subscriptions[customerId] || null;
    } catch (e) {
      console.error('[BILLING] Error getting subscription:', e.message);
      return null;
    }
  }
  
  /**
   * Renew subscription (for monthly/annual renewals)
   */
  async renewSubscription(customerId) {
    try {
      const subscriptions = this.loadSubscriptions();
      const sub = subscriptions[customerId];
      
      if (!sub || sub.status !== 'active') {
        return { success: false, error: 'No active subscription to renew' };
      }
      
      const plan = subscriptionService.plans[sub.plan];
      if (!plan) {
        return { success: false, error: 'Invalid plan' };
      }
      
      // Create renewal invoice
      const amount = sub.billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
      const invoice = await this.createInvoice(customerId, sub.plan, sub.billingCycle, amount, sub.currency);
      
      // Create checkout for renewal
      const customer = this.getCustomerDetails(customerId);
      const checkout = await this.createDirectPayCheckout(invoice, {
        email: customer?.email,
        name: customer?.name,
        successUrl: `https://ai-gateway.innoserver.cloud/portal/renewal/success?invoice=${invoice.id}`,
        cancelUrl: `https://ai-gateway.innoserver.cloud/portal/renewal/cancel?invoice=${invoice.id}`
      });
      
      return {
        success: true,
        invoiceId: invoice.id,
        checkoutUrl: checkout.checkoutUrl,
        message: 'Please complete payment to renew subscription'
      };
    } catch (e) {
      console.error('[BILLING] Error renewing subscription:', e.message);
      return { success: false, error: e.message };
    }
  }
  
  /**
   * Cancel subscription
   */
  cancelSubscription(customerId) {
    try {
      const subscriptions = this.loadSubscriptions();
      
      if (!subscriptions[customerId]) {
        return { success: false, error: 'No subscription found' };
      }
      
      subscriptions[customerId].status = 'cancelled';
      subscriptions[customerId].cancelledAt = new Date().toISOString();
      subscriptions[customerId].autoRenew = false;
      
      this.saveSubscriptions(subscriptions);
      
      // Downgrade to free plan at period end
      // (In production, you'd schedule this)
      
      return {
        success: true,
        message: 'Subscription cancelled. Access continues until period end.',
        validUntil: subscriptions[customerId].currentPeriodEnd
      };
    } catch (e) {
      console.error('[BILLING] Error cancelling subscription:', e.message);
      return { success: false, error: e.message };
    }
  }
  
  /**
   * Get customer's billing history
   */
  getBillingHistory(customerId) {
    try {
      const invoices = this.loadInvoices();
      const customerInvoices = Object.values(invoices)
        .filter(inv => inv.customerId === customerId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return {
        success: true,
        invoices: customerInvoices
      };
    } catch (e) {
      console.error('[BILLING] Error getting billing history:', e.message);
      return { success: false, error: e.message };
    }
  }
  
  /**
   * Helper: Get period end date
   */
  getPeriodEnd(billingCycle) {
    const now = new Date();
    if (billingCycle === 'yearly') {
      return new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
    }
    return new Date(now.setMonth(now.getMonth() + 1)).toISOString();
  }
  
  /**
   * Helper: Update customer plan
   */
  updateCustomerPlan(customerId, planId) {
    try {
      const customersFile = path.join(DATA_DIR, 'customers.json');
      let customers = {};
      
      if (fs.existsSync(customersFile)) {
        customers = JSON.parse(fs.readFileSync(customersFile, 'utf8'));
      }
      
      if (!customers[customerId]) {
        customers[customerId] = {};
      }
      
      customers[customerId].plan = planId;
      customers[customerId].planUpdatedAt = new Date().toISOString();
      
      fs.writeFileSync(customersFile, JSON.stringify(customers, null, 2));
      return true;
    } catch (e) {
      console.error('[BILLING] Error updating customer plan:', e.message);
      return false;
    }
  }
  
  /**
   * Helper: Get customer details
   */
  getCustomerDetails(customerId) {
    try {
      const customersFile = path.join(DATA_DIR, 'customers.json');
      if (fs.existsSync(customersFile)) {
        const customers = JSON.parse(fs.readFileSync(customersFile, 'utf8'));
        return customers[customerId] || null;
      }
      return null;
    } catch (e) {
      console.error('[BILLING] Error getting customer details:', e.message);
      return null;
    }
  }
  
  // File operations
  loadInvoices() {
    try {
      if (fs.existsSync(INVOICES_FILE)) {
        return JSON.parse(fs.readFileSync(INVOICES_FILE, 'utf8'));
      }
      return {};
    } catch (e) {
      console.error('[BILLING] Error loading invoices:', e.message);
      return {};
    }
  }
  
  saveInvoices(invoices) {
    try {
      fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2));
      return true;
    } catch (e) {
      console.error('[BILLING] Error saving invoices:', e.message);
      return false;
    }
  }
  
  loadSubscriptions() {
    try {
      if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
        return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8'));
      }
      return {};
    } catch (e) {
      console.error('[BILLING] Error loading subscriptions:', e.message);
      return {};
    }
  }
  
  saveSubscriptions(subscriptions) {
    try {
      fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
      return true;
    } catch (e) {
      console.error('[BILLING] Error saving subscriptions:', e.message);
      return false;
    }
  }
}

// Export singleton
module.exports = new SubscriptionBillingService();
