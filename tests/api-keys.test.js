/**
 * API Key Management Tests
 * Tests for API key CRUD operations
 */

const { testUtils } = require('./setup');

describe('API Key Management', () => {
  let customerService;
  let customerId;

  beforeEach(async () => {
    jest.resetModules();
    testUtils.resetMockData();
    customerService = require('../src/services/customer-service');
    const customerData = testUtils.createTestCustomerData();
    const result = await customerService.registerCustomer(customerData);
    customerId = result.customer.id;
  });

  describe('Create API Key', () => {
    test('should create a new API key', () => {
      const result = customerService.createApiKey(customerId, 'Test Key');
      
      expect(result.success).toBe(true);
      expect(result.apiKey).toBeDefined();
      expect(result.apiKey.id).toMatch(/^key_/);
      expect(result.apiKey.key).toMatch(/^ik_/);
      expect(result.apiKey.name).toBe('Test Key');
      expect(result.apiKey.status).toBe('active');
    });

    test('should create API key with default name', () => {
      const result = customerService.createApiKey(customerId);
      
      expect(result.apiKey.name).toBe('API Key');
    });

    test('should return full key only once on creation', () => {
      const result = customerService.createApiKey(customerId, 'One Time Key');
      
      expect(result.apiKey.key).toBeDefined();
      expect(result.message).toContain("Copy it now - it won't be shown again");
    });

    test('should set key properties correctly', () => {
      const result = customerService.createApiKey(customerId, 'Production Key');
      
      expect(result.apiKey.customerId).toBeUndefined(); // Not exposed in response
      expect(result.apiKey.createdAt).toBeDefined();
      expect(result.apiKey.status).toBe('active');
    });

    test('should generate unique keys for multiple API keys', () => {
      const key1 = customerService.createApiKey(customerId, 'Key 1');
      const key2 = customerService.createApiKey(customerId, 'Key 2');
      
      expect(key1.apiKey.id).not.toBe(key2.apiKey.id);
      expect(key1.apiKey.key).not.toBe(key2.apiKey.key);
    });

    test('should store API key in data file', () => {
      customerService.createApiKey(customerId, 'Stored Key');
      
      const apiKeys = testUtils.getMockApiKeys();
      const storedKey = apiKeys.data.find(k => k.customerId === customerId && k.name === 'Stored Key');
      
      expect(storedKey).toBeDefined();
      expect(storedKey.key).toMatch(/^ik_/);
    });
  });

  describe('Get API Keys', () => {
    beforeEach(() => {
      customerService.createApiKey(customerId, 'Key 1');
      customerService.createApiKey(customerId, 'Key 2');
      customerService.createApiKey(customerId, 'Key 3');
    });

    test('should get all API keys for customer', () => {
      const keys = customerService.getApiKeys(customerId);
      
      // 3 created + 1 default from registration
      expect(keys.length).toBe(4);
    });

    test('should return sanitized key data (no actual key)', () => {
      const keys = customerService.getApiKeys(customerId);
      
      keys.forEach(key => {
        expect(key.id).toBeDefined();
        expect(key.name).toBeDefined();
        expect(key.key).toBeUndefined(); // Key should not be exposed
        expect(key.createdAt).toBeDefined();
        expect(key.status).toBeDefined();
      });
    });

    test('should return empty array for customer with no keys', () => {
      const newCustomerData = testUtils.createTestCustomerData({ email: 'new@example.com' });
      // We'll create customer manually without default key
      const storedCustomer = testUtils.createStoredCustomer({ 
        id: 'cust_new123', 
        email: 'new@example.com' 
      });
      testUtils.setMockCustomers([storedCustomer]);
      
      const keys = customerService.getApiKeys('cust_new123');
      
      expect(keys).toEqual([]);
    });

    test('should not include keys from other customers', () => {
      // Create another customer with keys
      const otherCustomerId = 'cust_other123';
      const mockKeys = testUtils.getMockApiKeys().data;
      mockKeys.push({
        id: 'key_other456',
        customerId: otherCustomerId,
        name: 'Other Customer Key',
        key: 'ik_othersecretkey',
        createdAt: new Date().toISOString(),
        status: 'active'
      });
      testUtils.setMockApiKeys(mockKeys);
      
      const keys = customerService.getApiKeys(customerId);
      
      const otherKey = keys.find(k => k.name === 'Other Customer Key');
      expect(otherKey).toBeUndefined();
    });

    test('should include usage statistics', () => {
      // Simulate key usage
      const apiKeys = testUtils.getMockApiKeys();
      apiKeys.data[0].usageCount = 150;
      apiKeys.data[0].lastUsed = new Date().toISOString();
      testUtils.setMockApiKeys(apiKeys.data);
      
      const keys = customerService.getApiKeys(customerId);
      const usedKey = keys.find(k => k.usageCount === 150);
      
      expect(usedKey).toBeDefined();
      expect(usedKey.usageCount).toBe(150);
      expect(usedKey.lastUsed).toBeDefined();
    });
  });

  describe('Revoke API Key', () => {
    let keyId;

    beforeEach(() => {
      const result = customerService.createApiKey(customerId, 'Key to Revoke');
      keyId = result.apiKey.id;
    });

    test('should revoke API key', () => {
      const result = customerService.revokeApiKey(customerId, keyId);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('API key revoked');
    });

    test('should change key status to revoked', () => {
      customerService.revokeApiKey(customerId, keyId);
      
      const apiKeys = testUtils.getMockApiKeys();
      const revokedKey = apiKeys.data.find(k => k.id === keyId);
      
      expect(revokedKey.status).toBe('revoked');
    });

    test('should throw error for non-existent key', () => {
      expect(() => customerService.revokeApiKey(customerId, 'key_nonexistent'))
        .toThrow('API key not found');
    });

    test('should throw error for other customer key', () => {
      // Create key for another customer
      const mockKeys = testUtils.getMockApiKeys().data;
      mockKeys.push({
        id: 'key_other456',
        customerId: 'cust_other',
        name: 'Other Key',
        key: 'ik_other',
        status: 'active'
      });
      testUtils.setMockApiKeys(mockKeys);
      
      expect(() => customerService.revokeApiKey(customerId, 'key_other456'))
        .toThrow('API key not found');
    });

    test('should revoke already revoked key (idempotent)', () => {
      customerService.revokeApiKey(customerId, keyId);
      
      // Should not throw
      const result = customerService.revokeApiKey(customerId, keyId);
      expect(result.success).toBe(true);
    });
  });

  describe('Validate API Key', () => {
    let apiKey;
    let keyValue;

    beforeEach(() => {
      const result = customerService.createApiKey(customerId, 'Validation Key');
      apiKey = result.apiKey;
      keyValue = result.apiKey.key;
    });

    test('should validate active API key', () => {
      const customer = customerService.validateApiKey(keyValue);
      
      expect(customer).toBeDefined();
      expect(customer.id).toBe(customerId);
    });

    test('should return null for invalid key', () => {
      const customer = customerService.validateApiKey('ik_invalid_key');
      
      expect(customer).toBeNull();
    });

    test('should return null for revoked key', () => {
      customerService.revokeApiKey(customerId, apiKey.id);
      
      const customer = customerService.validateApiKey(keyValue);
      expect(customer).toBeNull();
    });

    test('should return null for expired key', () => {
      const mockKeys = testUtils.getMockApiKeys().data;
      mockKeys[1].expiresAt = new Date(Date.now() - 86400000).toISOString(); // Yesterday
      testUtils.setMockApiKeys(mockKeys);
      
      const customer = customerService.validateApiKey(keyValue);
      expect(customer).toBeNull();
    });

    test('should update usage on validation', () => {
      customerService.validateApiKey(keyValue);
      
      const apiKeys = testUtils.getMockApiKeys();
      const validatedKey = apiKeys.data.find(k => k.id === apiKey.id);
      
      expect(validatedKey.usageCount).toBe(1);
      expect(validatedKey.lastUsed).toBeDefined();
    });

    test('should increment usage count on multiple validations', () => {
      customerService.validateApiKey(keyValue);
      customerService.validateApiKey(keyValue);
      customerService.validateApiKey(keyValue);
      
      const apiKeys = testUtils.getMockApiKeys();
      const validatedKey = apiKeys.data.find(k => k.id === apiKey.id);
      
      expect(validatedKey.usageCount).toBe(3);
    });

    test('should return sanitized customer data', () => {
      const customer = customerService.validateApiKey(keyValue);
      
      expect(customer.passwordHash).toBeUndefined();
    });
  });

  describe('API Key Properties', () => {
    test('should generate keys with correct format', () => {
      const result = customerService.createApiKey(customerId, 'Format Test');
      
      // ID format: key_ + 16 hex characters
      expect(result.apiKey.id).toMatch(/^key_[a-f0-9]{16}$/);
      
      // Key format: ik_ + base64url characters
      expect(result.apiKey.key).toMatch(/^ik_[A-Za-z0-9_-]+$/);
      expect(result.apiKey.key.length).toBeGreaterThan(20);
    });

    test('should set creation timestamp', () => {
      const before = Date.now();
      const result = customerService.createApiKey(customerId, 'Timestamp Test');
      const after = Date.now();
      
      const createdTime = new Date(result.apiKey.createdAt).getTime();
      expect(createdTime).toBeGreaterThanOrEqual(before);
      expect(createdTime).toBeLessThanOrEqual(after);
    });

    test('should initialize usage stats to zero', () => {
      const result = customerService.createApiKey(customerId, 'Stats Test');
      
      const apiKeys = testUtils.getMockApiKeys();
      const newKey = apiKeys.data.find(k => k.id === result.apiKey.id);
      
      expect(newKey.usageCount).toBe(0);
      expect(newKey.lastUsed).toBeNull();
    });
  });
});
