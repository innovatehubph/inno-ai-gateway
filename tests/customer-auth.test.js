/**
 * Customer Authentication Tests
 * Tests for registration, login, JWT validation, and customer management
 */

const { testUtils } = require('./setup');

describe('Customer Authentication', () => {
  let customerService;

  beforeEach(() => {
    jest.resetModules();
    testUtils.resetMockData();
    customerService = require('../src/services/customer-service');
  });

  describe('Customer Registration', () => {
    test('should register a new customer successfully', async () => {
      const customerData = testUtils.createTestCustomerData();
      
      const result = await customerService.registerCustomer(customerData);
      
      expect(result.success).toBe(true);
      expect(result.customer).toBeDefined();
      expect(result.customer.email).toBe(customerData.email.toLowerCase());
      expect(result.customer.name).toBe(customerData.name);
      expect(result.customer.tier).toBe('free');
      expect(result.customer.id).toMatch(/^cust_/);
      expect(result.customer.passwordHash).toBeUndefined();
      expect(result.message).toContain('Registration successful');
    });

    test('should reject duplicate email registration', async () => {
      const customerData = testUtils.createTestCustomerData();
      await customerService.registerCustomer(customerData);
      
      await expect(customerService.registerCustomer(customerData))
        .rejects.toThrow('Email already registered');
    });

    test('should reject registration without email', async () => {
      const customerData = testUtils.createTestCustomerData({ email: undefined });
      
      await expect(customerService.registerCustomer(customerData))
        .rejects.toThrow('Email, password, and name are required');
    });

    test('should reject registration without password', async () => {
      const customerData = testUtils.createTestCustomerData({ password: undefined });
      
      await expect(customerService.registerCustomer(customerData))
        .rejects.toThrow('Email, password, and name are required');
    });

    test('should reject registration without name', async () => {
      const customerData = testUtils.createTestCustomerData({ name: undefined });
      
      await expect(customerService.registerCustomer(customerData))
        .rejects.toThrow('Email, password, and name are required');
    });

    test('should reject invalid email format', async () => {
      const customerData = testUtils.createTestCustomerData({ email: 'invalid-email' });
      
      await expect(customerService.registerCustomer(customerData))
        .rejects.toThrow('Invalid email format');
    });

    test('should reject short password (less than 8 characters)', async () => {
      const customerData = testUtils.createTestCustomerData({ password: 'short' });
      
      await expect(customerService.registerCustomer(customerData))
        .rejects.toThrow('Password must be at least 8 characters');
    });

    test('should convert email to lowercase', async () => {
      const customerData = testUtils.createTestCustomerData({ email: 'TEST@EXAMPLE.COM' });
      
      const result = await customerService.registerCustomer(customerData);
      
      expect(result.customer.email).toBe('test@example.com');
    });

    test('should create default API key on registration', async () => {
      const customerData = testUtils.createTestCustomerData();
      
      const result = await customerService.registerCustomer(customerData);
      
      const apiKeys = testUtils.getMockApiKeys();
      const customerKeys = apiKeys.data.filter(k => k.customerId === result.customer.id);
      expect(customerKeys.length).toBe(1);
      expect(customerKeys[0].name).toBe('Default Key');
    });

    test('should initialize usage tracking on registration', async () => {
      const customerData = testUtils.createTestCustomerData();
      
      const result = await customerService.registerCustomer(customerData);
      
      const usage = testUtils.getMockUsage();
      const customerUsage = usage.usage.find(u => u.customerId === result.customer.id);
      expect(customerUsage).toBeDefined();
      expect(customerUsage.totalRequests).toBe(0);
      expect(customerUsage.totalTokens).toBe(0);
    });

    test('should use default tier when not specified', async () => {
      const customerData = testUtils.createTestCustomerData();
      delete customerData.tier;
      
      const result = await customerService.registerCustomer(customerData);
      
      expect(result.customer.tier).toBe('free');
    });

    test('should allow custom tier specification', async () => {
      const customerData = testUtils.createTestCustomerData({ tier: 'starter' });
      
      const result = await customerService.registerCustomer(customerData);
      
      expect(result.customer.tier).toBe('starter');
    });
  });

  describe('Customer Login', () => {
    beforeEach(async () => {
      const customerData = testUtils.createTestCustomerData();
      await customerService.registerCustomer(customerData);
    });

    test('should login with valid credentials', async () => {
      const result = await customerService.loginCustomer('test@example.com', 'password123');
      
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.customer).toBeDefined();
      expect(result.customer.email).toBe('test@example.com');
      expect(result.expiresIn).toBe('7d');
    });

    test('should reject login with invalid email', async () => {
      await expect(customerService.loginCustomer('nonexistent@example.com', 'password123'))
        .rejects.toThrow('Invalid email or password');
    });

    test('should reject login with invalid password', async () => {
      await expect(customerService.loginCustomer('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid email or password');
    });

    test('should reject login for suspended account', async () => {
      // Modify customer status to suspended
      const customers = testUtils.getMockCustomers();
      customers.data[0].status = 'suspended';
      testUtils.setMockCustomers(customers.data);
      
      await expect(customerService.loginCustomer('test@example.com', 'password123'))
        .rejects.toThrow('Account is suspended');
    });

    test('should update login stats on successful login', async () => {
      await customerService.loginCustomer('test@example.com', 'password123');
      
      const customers = testUtils.getMockCustomers();
      const customer = customers.data[0];
      
      expect(customer.loginCount).toBe(1);
      expect(customer.lastLogin).toBeDefined();
    });

    test('should be case-insensitive for email', async () => {
      const result = await customerService.loginCustomer('TEST@EXAMPLE.COM', 'password123');
      
      expect(result.success).toBe(true);
    });

    test('should increment login count on multiple logins', async () => {
      await customerService.loginCustomer('test@example.com', 'password123');
      await customerService.loginCustomer('test@example.com', 'password123');
      await customerService.loginCustomer('test@example.com', 'password123');
      
      const customers = testUtils.getMockCustomers();
      expect(customers.data[0].loginCount).toBe(3);
    });
  });

  describe('JWT Token Management', () => {
    let token;
    let customerId;

    beforeEach(async () => {
      const customerData = testUtils.createTestCustomerData();
      const result = await customerService.registerCustomer(customerData);
      customerId = result.customer.id;
      const loginResult = await customerService.loginCustomer('test@example.com', 'password123');
      token = loginResult.token;
    });

    test('should verify valid JWT token', () => {
      const decoded = customerService.verifyToken(token);
      
      expect(decoded.customerId).toBe(customerId);
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.tier).toBe('free');
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    test('should reject invalid token', () => {
      expect(() => customerService.verifyToken('invalid-token'))
        .toThrow('Invalid or expired token');
    });

    test('should reject malformed token', () => {
      expect(() => customerService.verifyToken('not-a-jwt'))
        .toThrow('Invalid or expired token');
    });

    test('should reject empty token', () => {
      expect(() => customerService.verifyToken(''))
        .toThrow('Invalid or expired token');
    });
  });

  describe('Get Customer', () => {
    let customerId;

    beforeEach(async () => {
      const customerData = testUtils.createTestCustomerData();
      const result = await customerService.registerCustomer(customerData);
      customerId = result.customer.id;
    });

    test('should get customer by ID', () => {
      const customer = customerService.getCustomer(customerId);
      
      expect(customer).toBeDefined();
      expect(customer.id).toBe(customerId);
      expect(customer.email).toBe('test@example.com');
    });

    test('should return sanitized customer (no password hash)', () => {
      const customer = customerService.getCustomer(customerId);
      
      expect(customer.passwordHash).toBeUndefined();
    });

    test('should throw error for non-existent customer', () => {
      expect(() => customerService.getCustomer('cust_nonexistent'))
        .toThrow('Customer not found');
    });
  });

  describe('Update Customer', () => {
    let customerId;

    beforeEach(async () => {
      const customerData = testUtils.createTestCustomerData();
      const result = await customerService.registerCustomer(customerData);
      customerId = result.customer.id;
    });

    test('should update customer name', () => {
      const result = customerService.updateCustomer(customerId, { name: 'Updated Name' });
      
      expect(result.success).toBe(true);
      expect(result.customer.name).toBe('Updated Name');
    });

    test('should update customer company', () => {
      const result = customerService.updateCustomer(customerId, { company: 'New Company' });
      
      expect(result.success).toBe(true);
      expect(result.customer.company).toBe('New Company');
    });

    test('should update customer settings', () => {
      const newSettings = { notifications: false, newsletter: false };
      const result = customerService.updateCustomer(customerId, { settings: newSettings });
      
      expect(result.success).toBe(true);
      expect(result.customer.settings).toEqual(newSettings);
    });

    test('should not update restricted fields', () => {
      const result = customerService.updateCustomer(customerId, { 
        email: 'newemail@example.com',
        tier: 'enterprise'
      });
      
      expect(result.success).toBe(true);
      expect(result.customer.email).toBe('test@example.com');
      expect(result.customer.tier).toBe('free');
    });

    test('should throw error for non-existent customer', () => {
      expect(() => customerService.updateCustomer('cust_nonexistent', { name: 'Test' }))
        .toThrow('Customer not found');
    });

    test('should update updatedAt timestamp', () => {
      const before = new Date().toISOString();
      customerService.updateCustomer(customerId, { name: 'Updated' });
      const after = new Date().toISOString();
      
      const customer = customerService.getCustomer(customerId);
      expect(new Date(customer.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    });
  });

  describe('Change Password', () => {
    let customerId;

    beforeEach(async () => {
      const customerData = testUtils.createTestCustomerData();
      const result = await customerService.registerCustomer(customerData);
      customerId = result.customer.id;
    });

    test('should change password with valid current password', () => {
      const result = customerService.changePassword(customerId, 'password123', 'newpassword123');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Password updated successfully');
    });

    test('should reject password change with invalid current password', () => {
      expect(() => customerService.changePassword(customerId, 'wrongpassword', 'newpassword123'))
        .toThrow('Current password is incorrect');
    });

    test('should reject short new password', () => {
      expect(() => customerService.changePassword(customerId, 'password123', 'short'))
        .toThrow('New password must be at least 8 characters');
    });

    test('should throw error for non-existent customer', () => {
      expect(() => customerService.changePassword('cust_nonexistent', 'password123', 'newpassword123'))
        .toThrow('Customer not found');
    });

    test('should allow login with new password after change', async () => {
      customerService.changePassword(customerId, 'password123', 'newpassword123');
      
      const result = await customerService.loginCustomer('test@example.com', 'newpassword123');
      expect(result.success).toBe(true);
    });

    test('should reject login with old password after change', async () => {
      customerService.changePassword(customerId, 'password123', 'newpassword123');
      
      await expect(customerService.loginCustomer('test@example.com', 'password123'))
        .rejects.toThrow('Invalid email or password');
    });
  });

  describe('Email Validation', () => {
    test('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.co.uk',
        'user+tag@example.com',
        '123@example.com',
        'first.last@sub.domain.com'
      ];

      validEmails.forEach(email => {
        expect(customerService.isValidEmail(email)).toBe(true);
      });
    });

    test('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user name@example.com',
        ''
      ];

      invalidEmails.forEach(email => {
        expect(customerService.isValidEmail(email)).toBe(false);
      });
    });
  });
});
