/**
 * Test Setup and Utilities
 * Shared test utilities and mocks for InnoAI Platform
 */

const path = require('path');

// Mock configuration paths
const TEST_CONFIG_DIR = path.join(__dirname, 'fixtures', 'config');

// Mock data stores
let mockCustomers = { data: [] };
let mockApiKeys = { data: [] };
let mockUsage = { usage: [] };
let mockTransactions = { transactions: [] };
let mockDirectPayConfig = {
  environment: 'sandbox',
  apiBase: 'https://sandbox.directpayph.com/api',
  dashboard: 'https://sandbox.directpayph.com',
  merchantId: 'TEST5VMFBNLCWJKD', // 16 bytes for IV
  merchantKey: 'KEYYS4A4OWZL4SV5123456789012345', // 32 bytes for AES-256 key
  minAmount: 100,
  currency: 'PHP'
};

// Reset all mock data before each test
function resetMockData() {
  mockCustomers = { data: [] };
  mockApiKeys = { data: [] };
  mockUsage = { usage: [] };
  mockTransactions = { transactions: [] };
  mockDirectPayConfig = {
    environment: 'sandbox',
    apiBase: 'https://sandbox.directpayph.com/api',
    dashboard: 'https://sandbox.directpayph.com',
    merchantId: 'TEST5VMFBNLCWJKD', // 16 bytes for IV
    merchantKey: 'KEYYS4A4OWZL4SV5123456789012345', // 32 bytes for AES-256 key
    minAmount: 100,
    currency: 'PHP'
  };
}

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn((filePath) => {
    if (filePath.includes('config')) return true;
    return jest.requireActual('fs').existsSync(filePath);
  }),
  readFileSync: jest.fn((filePath, encoding) => {
    if (filePath.includes('customers.json')) return JSON.stringify(mockCustomers);
    if (filePath.includes('customer-api-keys.json')) return JSON.stringify(mockApiKeys);
    if (filePath.includes('customer-usage.json')) return JSON.stringify(mockUsage);
    if (filePath.includes('transactions.json')) return JSON.stringify(mockTransactions);
    if (filePath.includes('directpay.json')) return JSON.stringify(mockDirectPayConfig);
    return jest.requireActual('fs').readFileSync(filePath, encoding);
  }),
  writeFileSync: jest.fn((filePath, data) => {
    if (filePath.includes('customers.json')) mockCustomers = JSON.parse(data);
    if (filePath.includes('customer-api-keys.json')) mockApiKeys = JSON.parse(data);
    if (filePath.includes('customer-usage.json')) mockUsage = JSON.parse(data);
    if (filePath.includes('transactions.json')) mockTransactions = JSON.parse(data);
    if (filePath.includes('directpay.json')) mockDirectPayConfig = JSON.parse(data);
  }),
  mkdirSync: jest.fn(),
  chmodSync: jest.fn()
}));

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

// Test utilities
const testUtils = {
  resetMockData,
  
  // Create a test customer
  createTestCustomerData: (overrides = {}) => ({
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    company: 'Test Company',
    tier: 'free',
    ...overrides
  }),

  // Create a valid test customer object (as stored)
  createStoredCustomer: (overrides = {}) => ({
    id: 'cust_' + Buffer.from(Math.random().toString()).toString('hex').slice(0, 16),
    email: 'test@example.com',
    name: 'Test User',
    company: 'Test Company',
    tier: 'free',
    status: 'active',
    passwordHash: 'salt:hash',
    emailVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: null,
    loginCount: 0,
    settings: { notifications: true, newsletter: true },
    ...overrides
  }),

  // Setup mock customers in store
  setMockCustomers: (customers) => {
    mockCustomers = { data: customers };
  },

  // Setup mock API keys in store
  setMockApiKeys: (keys) => {
    mockApiKeys = { data: keys };
  },

  // Setup mock transactions in store
  setMockTransactions: (transactions) => {
    mockTransactions = { transactions };
  },

  // Get current mock data
  getMockCustomers: () => mockCustomers,
  getMockApiKeys: () => mockApiKeys,
  getMockUsage: () => mockUsage,
  getMockTransactions: () => mockTransactions,
  getMockDirectPayConfig: () => mockDirectPayConfig
};

// Export utilities for use in test files
module.exports = {
  testUtils,
  resetMockData
};
