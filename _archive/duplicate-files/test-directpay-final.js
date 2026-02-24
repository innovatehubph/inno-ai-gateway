/**
 * DirectPay API Test - Final Version
 * Tests with complete required fields
 */

const axios = require('axios');

const config = {
  environment: 'sandbox',
  apiBase: 'https://sandbox.directpayph.com/api',
  merchantId: 'TEST5VMFBNLCWJKD',
  merchantKey: 'KEYYS4A4OWZL4SV5',
  minAmount: 100,
  currency: 'PHP'
};

async function testDirectPayCheckout() {
  console.log('🧪 Testing DirectPay Checkout - Complete Data');
  console.log('==============================================\n');
  
  const checkoutData = {
    merchant_id: config.merchantId,
    items: [
      {
        product_id: 'starter-plan',
        name: 'Starter Subscription',
        description: 'Monthly AI Gateway Subscription',
        price: 495.00,
        quantity: 1
      }
    ],
    customer: {
      first_name: 'Juan',
      last_name: 'Dela Cruz',
      email: 'juan@example.com',
      phone: '09123456789',
      address: {
        street: '123 Main Street',
        city: 'Makati',
        province: 'Metro Manila',
        zip: '1200',
        country: 'Philippines'
      }
    },
    payment_method: 'gcash',
    shipping_region: 'metro_manila',
    subtotal: 495.00,
    total: 495.00,
    currency: 'PHP',
    description: 'AI Gateway Starter Plan Subscription',
    metadata: {
      customerId: 'test-customer-001',
      planId: 'starter',
      created_at: new Date().toISOString()
    },
    success_url: 'https://ai-gateway.innoserver.cloud/payment/success',
    cancel_url: 'https://ai-gateway.innoserver.cloud/payment/cancel',
    webhook_url: 'https://ai-gateway.innoserver.cloud/subscriptions/webhook/directpay'
  };
  
  console.log('Request:', JSON.stringify(checkoutData, null, 2));
  console.log('\nSending request...\n');
  
  try {
    const response = await axios.post(
      `${config.apiBase}/checkout`,
      checkoutData,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-ID': config.merchantId,
          'X-API-Key': config.merchantKey,
          'Accept': 'application/json'
        },
        timeout: 30000,
        validateStatus: () => true
      }
    );
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 || response.status === 201) {
      console.log('\n✅ SUCCESS! Checkout created!');
      if (response.data.checkout_url || response.data.payment_url) {
        console.log('\n🔗 Checkout URL:', response.data.checkout_url || response.data.payment_url);
      }
      if (response.data.reference) {
        console.log('📋 Reference:', response.data.reference);
      }
      return true;
    } else {
      console.log('\n❌ Failed with status', response.status);
      return false;
    }
  } catch (e) {
    console.error('Error:', e.message);
    if (e.response) {
      console.error('Response:', JSON.stringify(e.response.data, null, 2));
    }
    return false;
  }
}

testDirectPayCheckout();
