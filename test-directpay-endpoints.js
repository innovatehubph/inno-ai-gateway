/**
 * DirectPay API Test - Find Correct Endpoint
 */

const axios = require('axios');

const config = {
  apiBase: 'https://sandbox.directpayph.com/api',
  merchantId: 'TEST5VMFBNLCWJKD',
  merchantKey: 'KEYYS4A4OWZL4SV5'
};

const checkoutData = {
  merchant_id: config.merchantId,
  items: [{
    product_id: 'test-plan',
    name: 'Test Subscription',
    price: 100.00,
    quantity: 1
  }],
  customer: {
    first_name: 'Test',
    last_name: 'User',
    email: 'test@test.com',
    phone: '09123456789',
    address: {
      street: 'Test Street',
      city: 'Makati',
      province: 'Metro Manila',
      zip: '1200'
    }
  },
  payment_method: 'gcash',
  shipping_region: 'metro_manila',
  subtotal: 100.00,
  total: 100.00,
  currency: 'PHP'
};

async function testEndpoints() {
  console.log('🔍 Finding DirectPay Checkout Endpoint');
  console.log('=======================================\n');
  
  const endpoints = [
    '/checkout',
    '/v1/checkout',
    '/api/v1/checkout',
    '/payment/checkout',
    '/payments/checkout',
    '/transaction/checkout',
    '/transactions/checkout',
    '/pay/checkout',
    '/create-checkout',
    '/create-payment'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      
      const response = await axios.post(
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
      
      console.log(`  Status: ${response.status}`);
      
      if (response.status === 200 || response.status === 201) {
        console.log(`  ✅ FOUND! Endpoint: ${endpoint}`);
        console.log(`  Response:`, JSON.stringify(response.data, null, 2));
        return endpoint;
      } else if (response.status === 400) {
        console.log(`  ⚠️  400 - Wrong format but endpoint exists`);
      } else if (response.status === 404) {
        console.log(`  ❌ 404 - Not found`);
      } else {
        console.log(`  Response:`, response.data);
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }
  
  console.log('\n❌ No working endpoint found');
  return null;
}

testEndpoints();
