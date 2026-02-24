/**
 * Test DirectPay V2 Implementation
 */

const directpay = require('./src/services/directpay-v2');

async function testDirectPay() {
  console.log('🧪 Testing DirectPay V2 Integration\n');
  console.log('====================================\n');
  
  // Test 1: Get CSRF Token
  console.log('1️⃣  Getting CSRF Token...');
  const csrfResult = await directpay.getCsrfToken();
  console.log('Result:', csrfResult.success ? '✅ Success' : '❌ Failed');
  if (!csrfResult.success) {
    console.log('Error:', csrfResult.error);
    return;
  }
  console.log('Token:', csrfResult.csrfToken.substring(0, 20) + '...\n');
  
  // Test 2: Login
  console.log('2️⃣  Logging in...');
  const loginResult = await directpay.login();
  console.log('Result:', loginResult.success ? '✅ Success' : '❌ Failed');
  if (!loginResult.success) {
    console.log('Error:', loginResult.error);
    return;
  }
  console.log('Auth Token:', loginResult.token.substring(0, 30) + '...\n');
  
  // Test 3: Get User Info
  console.log('3️⃣  Getting User Info...');
  const userResult = await directpay.getUserInfo();
  console.log('Result:', userResult.success ? '✅ Success' : '❌ Failed');
  if (userResult.success) {
    console.log('Balance:', userResult.info.balance || 'N/A');
    console.log('User:', userResult.info.username || userResult.info.email || 'N/A');
  }
  console.log();
  
  // Test 4: Create Cash-in
  console.log('4️⃣  Creating Cash-in Transaction (₱100)...');
  const checkoutResult = await directpay.createCheckout({
    amount: 100,
    description: 'Test Subscription Payment',
    metadata: {
      customerId: 'test-customer-001',
      planId: 'starter',
      invoiceId: 'TEST-001'
    },
    successUrl: 'https://ai-gateway.innoserver.cloud/payment/success',
    webhookUrl: 'https://ai-gateway.innoserver.cloud/webhooks/directpay'
  });
  
  console.log('Result:', checkoutResult.success ? '✅ Success' : '❌ Failed');
  if (!checkoutResult.success) {
    console.log('Error:', checkoutResult.error);
    return;
  }
  
  console.log('Transaction ID:', checkoutResult.paymentId);
  console.log('Reference:', checkoutResult.reference);
  console.log('Checkout URL:', checkoutResult.checkoutUrl);
  console.log();
  
  // Test 5: Check Status
  console.log('5️⃣  Checking Transaction Status...');
  const statusResult = await directpay.checkTransactionStatus(checkoutResult.paymentId);
  console.log('Result:', statusResult.success ? '✅ Success' : '❌ Failed');
  if (statusResult.success) {
    console.log('Status:', JSON.stringify(statusResult.status, null, 2));
  }
  
  console.log('\n✅ All tests completed!');
}

testDirectPay().catch(console.error);
