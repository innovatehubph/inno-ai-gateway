/**
 * DirectPay API Test - Minimal Data
 */

const axios = require('axios');

const config = {
  apiBase: 'https://sandbox.directpayph.com/api',
  merchantId: 'TEST5VMFBNLCWJKD',
  merchantKey: 'KEYYS4A4OWZL4SV5'
};

async function testMinimalCheckout() {
  console.log('🧪 Testing DirectPay - Minimal Data');
  console.log('====================================\n');
  
  // Try different variations
  const variations = [
    {
      name: 'With items array only',
      data: {
        items: [{ name: 'Test', price: 100, quantity: 1 }],
        total: 100
      }
    },
    {
      name: 'With merchant_id',
      data: {
        merchant_id: config.merchantId,
        items: [{ name: 'Test', price: 100, quantity: 1 }],
        total: 100
      }
    },
    {
      name: 'Full format',
      data: {
        merchant_id: config.merchantId,
        items: [{ product_id: 'test', name: 'Test', price: 100, quantity: 1 }],
        customer: {
          first_name: 'Test',
          last_name: 'User',
          email: 'test@test.com',
          phone: '09123456789',
          address: {
            street: 'Test St',
            city: 'Makati',
            province: 'Metro Manila',
            zip: '1200'
          }
        },
        payment_method: 'gcash',
        subtotal: 100,
        total: 100,
        currency: 'PHP'
      }
    }
  ];
  
  for (const variation of variations) {
    console.log(`\n--- Testing: ${variation.name} ---`);
    console.log('Data:', JSON.stringify(variation.data, null, 2));
    
    try {
      const response = await axios.post(
        `${config.apiBase}/checkout`,
        variation.data,
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
      
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
      if (response.status === 200) {
        console.log('✅ SUCCESS!');
        break;
      }
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

testMinimalCheckout();
