/**
 * Subscription Tests
 * Tests for subscription tier upgrades and management
 */

const PRICING_STRATEGY = require('../src/services/pricing-strategy');
const { testUtils } = require('./setup');

describe('Customer Subscription', () => {
  let customerService;
  let directPayService;
  let customerId;

  beforeEach(async () => {
    jest.resetModules();
    testUtils.resetMockData();
    customerService = require('../src/services/customer-service');
    directPayService = require('../src/services/directpay');
    const customerData = testUtils.createTestCustomerData();
    const result = await customerService.registerCustomer(customerData);
    customerId = result.customer.id;
  });

  describe('Tier Upgrade', () => {
    test('should upgrade customer tier', () => {
      const result = customerService.updateCustomerTier(customerId, 'professional');
      
      expect(result.success).toBe(true);
      expect(result.customer.tier).toBe('professional');
      expect(result.message).toBe('Customer tier upgraded to professional');
    });

    test('should create subscription object on upgrade', () => {
      customerService.updateCustomerTier(customerId, 'starter');
      
      const customer = customerService.getCustomer(customerId);
      expect(customer.subscription).toBeDefined();
      expect(customer.subscription.tier).toBe('starter');
      expect(customer.subscription.status).toBe('active');
    });

    test('should set subscription timestamps', () => {
      const before = Date.now();
      customerService.updateCustomerTier(customerId, 'enterprise');
      const after = Date.now();
      
      const customer = customerService.getCustomer(customerId);
      const updatedTime = new Date(customer.subscription.updatedAt).getTime();
      expect(updatedTime).toBeGreaterThanOrEqual(before);
      expect(updatedTime).toBeLessThanOrEqual(after);
    });

    test('should throw error for non-existent customer', () => {
      expect(() => customerService.updateCustomerTier('cust_nonexistent', 'professional'))
        .toThrow('Customer not found');
    });

    test('should update customer timestamp on tier change', () => {
      const before = new Date().toISOString();
      customerService.updateCustomerTier(customerId, 'professional');
      const after = new Date().toISOString();
      
      const customer = customerService.getCustomer(customerId);
      expect(new Date(customer.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    });

    test('should allow multiple tier upgrades', () => {
      customerService.updateCustomerTier(customerId, 'starter');
      customerService.updateCustomerTier(customerId, 'professional');
      customerService.updateCustomerTier(customerId, 'enterprise');
      
      const customer = customerService.getCustomer(customerId);
      expect(customer.tier).toBe('enterprise');
      expect(customer.subscription.tier).toBe('enterprise');
    });

    test('should handle downgrade', () => {
      customerService.updateCustomerTier(customerId, 'enterprise');
      customerService.updateCustomerTier(customerId, 'starter');
      
      const customer = customerService.getCustomer(customerId);
      expect(customer.tier).toBe('starter');
    });
  });

  describe('Subscription Tiers Configuration', () => {
    test('should have all subscription tiers defined', () => {
      const tiers = PRICING_STRATEGY.ourStrategy.subscriptionTiers;
      
      expect(tiers.free).toBeDefined();
      expect(tiers.starter).toBeDefined();
      expect(tiers.professional).toBeDefined();
      expect(tiers.enterprise).toBeDefined();
    });

    test('should have correct pricing for each tier', () => {
      const tiers = PRICING_STRATEGY.ourStrategy.subscriptionTiers;
      
      expect(tiers.free.pricePHP).toBe(0);
      expect(tiers.starter.pricePHP).toBe(499);
      expect(tiers.professional.pricePHP).toBe(1499);
      expect(tiers.enterprise.pricePHP).toBe(4999);
    });

    test('should have limits defined for each tier', () => {
      const tiers = PRICING_STRATEGY.ourStrategy.subscriptionTiers;
      
      Object.values(tiers).forEach(tier => {
        expect(tier.limits).toBeDefined();
        expect(tier.limits.requestsPerDay).toBeDefined();
        expect(tier.limits.tokensPerMonth).toBeDefined();
        expect(tier.limits.concurrentRequests).toBeDefined();
      });
    });

    test('should have increasing limits for higher tiers', () => {
      const tiers = PRICING_STRATEGY.ourStrategy.subscriptionTiers;
      
      expect(tiers.starter.limits.requestsPerDay).toBeGreaterThan(tiers.free.limits.requestsPerDay);
      expect(tiers.professional.limits.requestsPerDay).toBeGreaterThan(tiers.starter.limits.requestsPerDay);
      expect(tiers.enterprise.limits.requestsPerDay).toBeGreaterThan(tiers.professional.limits.requestsPerDay);
    });

    test('should have features list for each tier', () => {
      const tiers = PRICING_STRATEGY.ourStrategy.subscriptionTiers;
      
      Object.values(tiers).forEach(tier => {
        expect(Array.isArray(tier.features)).toBe(true);
        expect(tier.features.length).toBeGreaterThan(0);
      });
    });

    test('should have target market for each tier', () => {
      const tiers = PRICING_STRATEGY.ourStrategy.subscriptionTiers;
      
      Object.values(tiers).forEach(tier => {
        expect(tier.targetMarket).toBeDefined();
        expect(typeof tier.targetMarket).toBe('string');
      });
    });
  });

  describe('Pay-as-You-Go Configuration', () => {
    test('should have pay-as-you-go enabled', () => {
      const payg = PRICING_STRATEGY.ourStrategy.payAsYouGo;
      
      expect(payg.enabled).toBe(true);
    });

    test('should have top-up options', () => {
      const payg = PRICING_STRATEGY.ourStrategy.payAsYouGo;
      
      expect(Array.isArray(payg.topUpOptions)).toBe(true);
      expect(payg.topUpOptions.length).toBeGreaterThan(0);
    });

    test('should have increasing bonuses for higher top-ups', () => {
      const options = PRICING_STRATEGY.ourStrategy.payAsYouGo.topUpOptions;
      
      for (let i = 1; i < options.length; i++) {
        expect(options[i].bonus).toBeGreaterThanOrEqual(options[i-1].bonus);
      }
    });

    test('should have volume discounts defined', () => {
      const discounts = PRICING_STRATEGY.ourStrategy.payAsYouGo.volumeDiscounts;
      
      expect(discounts).toBeDefined();
      expect(Object.keys(discounts).length).toBeGreaterThan(0);
    });
  });

  describe('Usage Tracking with Subscriptions', () => {
    beforeEach(async () => {
      // Initialize usage tracking
      customerService.initializeUsage(customerId);
    });

    test('should track usage for customer', () => {
      customerService.trackUsage(customerId, 'inno-ai-boyong-4.5', 1000, 0.5);
      
      const usage = customerService.getUsage(customerId);
      expect(usage.totalRequests).toBe(1);
      expect(usage.totalTokens).toBe(1000);
      expect(usage.totalCost).toBe(0.5);
    });

    test('should track usage by model', () => {
      customerService.trackUsage(customerId, 'inno-ai-boyong-4.5', 1000, 0.5);
      customerService.trackUsage(customerId, 'inno-ai-boyong-4.5', 2000, 1.0);
      customerService.trackUsage(customerId, 'inno-ai-boyong-4.0', 500, 0.25);
      
      const usage = customerService.getUsage(customerId);
      expect(usage.requestsByModel['inno-ai-boyong-4.5'].requests).toBe(2);
      expect(usage.requestsByModel['inno-ai-boyong-4.0'].requests).toBe(1);
    });

    test('should track daily usage', () => {
      customerService.trackUsage(customerId, 'inno-ai-boyong-4.5', 1000, 0.5);
      customerService.trackUsage(customerId, 'inno-ai-boyong-4.5', 2000, 1.0);
      
      const usage = customerService.getUsage(customerId);
      const today = new Date().toISOString().split('T')[0];
      
      expect(usage.recentDaily.length).toBeGreaterThan(0);
    });

    test('should get usage for specific period', () => {
      customerService.trackUsage(customerId, 'model1', 1000, 0.5);
      
      const usage = customerService.getUsage(customerId, '30d');
      expect(usage.totalRequests).toBe(1);
    });

    test('should return empty usage for new customer', () => {
      const newCustomerData = testUtils.createTestCustomerData({ email: 'new@example.com' });
      // Create customer manually
      const storedCustomer = testUtils.createStoredCustomer({
        id: 'cust_newusage',
        email: 'new@example.com'
      });
      testUtils.setMockCustomers([...testUtils.getMockCustomers().data, storedCustomer]);
      
      const usage = customerService.getUsage('cust_newusage');
      expect(usage.totalRequests).toBe(0);
      expect(usage.totalTokens).toBe(0);
      expect(usage.totalCost).toBe(0);
    });
  });

  describe('Webhook Integration with Subscription', () => {
    beforeEach(() => {
      // Set up subscription transaction
      testUtils.setMockTransactions([{
        id: 'pay_subscription_001',
        amount: '1499.00',
        currency: 'PHP',
        description: 'Professional tier subscription',
        status: 'pending',
        created_at: '2026-02-21T10:00:00Z',
        metadata: {
          type: 'subscription',
          customerId: customerId,
          tier: 'professional'
        }
      }]);
    });

    test('should upgrade customer tier on successful payment webhook', () => {
      const payload = {
        event: 'payment.success',
        data: {
          payment_id: 'pay_subscription_001',
          payment_method: 'gcash'
        }
      };
      
      directPayService.handleWebhook(payload);
      
      const customer = customerService.getCustomer(customerId);
      expect(customer.tier).toBe('professional');
    });

    test('should handle subscription upgrade for enterprise tier', async () => {
      // Update transaction to enterprise
      const transactions = testUtils.getMockTransactions();
      transactions.transactions[0].metadata.tier = 'enterprise';
      testUtils.setMockTransactions(transactions.transactions);
      
      const payload = {
        event: 'payment.success',
        data: {
          payment_id: 'pay_subscription_001',
          payment_method: 'credit_card'
        }
      };
      
      directPayService.handleWebhook(payload);
      
      const customer = customerService.getCustomer(customerId);
      expect(customer.tier).toBe('enterprise');
    });
  });

  describe('Pricing Model Validation', () => {
    test('should have chat models defined', () => {
      const chatModels = PRICING_STRATEGY.ourStrategy.philippinePricing.chatModels;
      
      expect(Object.keys(chatModels).length).toBeGreaterThan(0);
      Object.values(chatModels).forEach(model => {
        expect(model.phpInputPrice).toBeDefined();
        expect(model.phpOutputPrice).toBeDefined();
      });
    });

    test('should have image models defined', () => {
      const imageModels = PRICING_STRATEGY.ourStrategy.philippinePricing.imageModels;
      
      expect(Object.keys(imageModels).length).toBeGreaterThan(0);
      Object.values(imageModels).forEach(model => {
        expect(model.phpPrice).toBeDefined();
      });
    });

    test('should have video models defined', () => {
      const videoModels = PRICING_STRATEGY.ourStrategy.philippinePricing.videoModels;
      
      expect(Object.keys(videoModels).length).toBeGreaterThan(0);
      Object.values(videoModels).forEach(model => {
        expect(model.phpPricePerSecond).toBeDefined();
      });
    });

    test('should have Philippine market analysis', () => {
      const market = PRICING_STRATEGY.marketAnalysis.philippineMarket;
      
      expect(market.currency).toBe('PHP');
      expect(market.usdToPhpRate).toBeDefined();
      expect(market.priceSensitivity).toBe('high');
      expect(Array.isArray(market.preferredPayment)).toBe(true);
    });

    test('should have competitive advantages defined', () => {
      const advantages = PRICING_STRATEGY.competitiveAdvantages;
      
      expect(advantages.vsReplicate).toBeDefined();
      expect(advantages.vsFalAi).toBeDefined();
      expect(advantages.vsDirectAnthropic).toBeDefined();
      expect(Array.isArray(advantages.vsReplicate)).toBe(true);
    });
  });

  describe('Implementation Notes', () => {
    test('should have billing configuration', () => {
      const impl = PRICING_STRATEGY.implementation;
      
      expect(impl.billingCurrency).toBe('PHP');
      expect(impl.minimumCharge).toBe(100);
      expect(Array.isArray(impl.paymentMethods)).toBe(true);
    });

    test('should have cost optimization strategies', () => {
      const optimization = PRICING_STRATEGY.implementation.costOptimization;
      
      expect(optimization.caching).toBeDefined();
      expect(optimization.batchProcessing).toBeDefined();
      expect(optimization.freeTierLimit).toBeDefined();
    });
  });
});
