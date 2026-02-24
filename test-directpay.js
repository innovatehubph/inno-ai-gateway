/**
 * DirectPay API Test
 * Tests the integration with DirectPay sandbox
 */

const axios = require('axios');
const crypto = require('crypto');

// DirectPay Sandbox Config
const config = {
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

// AES-128-CBC Encryption (DirectPay uses this)
function encrypt(data) {
  try {
    const iv = Buffer.from(config.merchantId, 'utf8');
    const key = Buffer.from(config.merchantKey, 'utf8');
    
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return encrypted;
  } catch (e) {
    console.error('Encryption error:', e.message);
    throw e;
  }
}

// Test 1: Check API health
async function testHealth() {
  console.log('\n🧪 TEST 1: API Health Check');
  console.log('============================');
  
  try {
    const response = await axios.get(`${config.apiBase}/health`, {
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
    return response.status === 200;
  } catch (e) {
    console.error('Health check failed:', e.message);
    return false;
  }
}

// Test 2: Authenticate and get token
async function testAuthentication() {
  console.log('\n🧪 TEST 2: Authentication');
  console.log('==========================');
  
  try {
    // Try different authentication endpoints
    const authEndpoints = [
      '/auth/login',
      '/api/auth/login',
      '/v1/auth/login'
    ];
    
    for (const endpoint of authEndpoints) {
      try {
        console.log(`Trying ${endpoint}...`);
        
        const response = await axios.post(
          `${config.apiBase}${endpoint}`,
          {
            username: config.username,
            password: config.password
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
            validateStatus: () => true
          }
        );
        
        console.log(`Status: ${response.status}`);
        
        if (response.status === 200 && response.data.token) {
          console.log('✅ Authentication successful!');
          console.log('Token:', response.data.token.substring(0, 20) + '...');
          return response.data.token;
        }
      } catch (e) {
        console.log(`  ${endpoint} failed: ${e.message}`);
      }
    }
    
    console.log('⚠️  Could not authenticate with standard endpoints');
    return null;
  } catch (e) {
    console.error('Authentication error:', e.message);
    return null;
  }
}

// Test 3: Create checkout session
async function testCheckout() {
  console.log('\n🧪 TEST 3: Create Checkout');
  console.log('===========================');
  
  try {
    const checkoutData = {
      amount: 100.00,
      currency: 'PHP',
      description: 'Test Subscription Payment',
      merchant_id: config.merchantId,
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('Request data:', JSON.stringify(checkoutData, null, 2));
    
    // Try with encryption
    const encrypted = encrypt(checkoutData);
    console.log('Encrypted payload:', encrypted.substring(0, 50) + '...');
    
    // Try different checkout endpoints
    const checkoutEndpoints = [
      '/checkout',
      '/api/checkout',
      '/v1/checkout',
      '/payment/checkout'
    ];
    
    for (const endpoint of checkoutEndpoints) {
      try {
        console.log(`\nTrying ${endpoint}...`);
        
        // Try with encrypted payload
        let response = await axios.post(
          `${config.apiBase}${endpoint}`,
          { encrypted },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Merchant-ID': config.merchantId,
              'X-API-Key': config.merchantKey
            },
            timeout: 10000,
            validateStatus: () => true
          }
        );
        
        console.log(`Status: ${response.status}`);
        
        if (response.status === 200 || response.status === 201) {
          console.log('✅ Checkout created!');
          console.log('Response:', JSON.stringify(response.data, null, 2));
          return response.data;
        } else {
          console.log('Response:', response.data);
        }
        
        // Try without encryption
        console.log(`Trying ${endpoint} without encryption...`);
        response = await axios.post(
          `${config.apiBase}${endpoint}`,
          checkoutData,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Merchant-ID': config.merchantId,
              'X-API-Key': config.merchantKey
            },
            timeout: 10000,
            validateStatus: () => true
          }
        );
        
        console.log(`Status: ${response.status}`);
        
        if (response.status === 200 || response.status === 201) {
          console.log('✅ Checkout created (without encryption)!');
          console.log('Response:', JSON.stringify(response.data, null, 2));
          return response.data;
        } else {
          console.log('Response:', response.data);
        }
        
      } catch (e) {
        console.log(`  Error: ${e.message}`);
        if (e.response) {
          console.log(`  Status: ${e.response.status}`);
          console.log(`  Data:`, e.response.data);
        }
      }
    }
    
    console.log('⚠️  Could not create checkout with any endpoint');
    return null;
  } catch (e) {
    console.error('Checkout error:', e.message);
    return null;
  }
}

// Test 4: Get merchant info
async function testMerchantInfo() {
  console.log('\n🧪 TEST 4: Merchant Info');
  console.log('=========================');
  
  try {
    const response = await axios.get(
      `${config.apiBase}/merchant/info`,
      {
        headers: {
          'X-Merchant-ID': config.merchantId,
          'X-API-Key': config.merchantKey
        },
        timeout: 10000,
        validateStatus: () => true
      }
    );
    
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
    return response.status === 200;
  } catch (e) {
    console.error('Merchant info error:', e.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 DirectPay Sandbox Integration Test');
  console.log('=====================================\n');
  console.log('Config:', {
    apiBase: config.apiBase,
    merchantId: config.merchantId,
    username: config.username
  });
  
  const results = {
    health: await testHealth(),
    auth: await testAuthentication(),
    merchant: await testMerchantInfo(),
    checkout: await testCheckout()
  };
  
  console.log('\n📊 TEST RESULTS');
  console.log('================');
  console.log('Health Check:', results.health ? '✅ PASS' : '❌ FAIL');
  console.log('Authentication:', results.auth ? '✅ PASS' : '⚠️  SKIP/NO AUTH');
  console.log('Merchant Info:', results.merchant ? '✅ PASS' : '❌ FAIL');
  console.log('Checkout:', results.checkout ? '✅ PASS' : '❌ FAIL');
  
  console.log('\n💡 NEXT STEPS');
  console.log('=============');
  if (!results.checkout) {
    console.log('❌ Checkout endpoint not found or authentication required');
    console.log('   - Check DirectPay API documentation for correct endpoints');
    console.log('   - Verify merchant credentials are correct');
    console.log('   - May need to authenticate first before creating checkout');
  }
}

runTests().catch(console.error);
