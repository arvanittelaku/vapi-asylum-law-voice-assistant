/**
 * Test Twilio SMS Configuration
 */
require('dotenv').config();

console.log('=== TWILIO SMS TEST ===\n');

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const phone = process.env.TWILIO_PHONE_NUMBER;

console.log('Twilio Config:');
console.log('  Account SID:', sid ? sid.substring(0, 10) + '...' : 'NOT SET');
console.log('  Auth Token:', token ? 'Set (' + token.length + ' chars)' : 'NOT SET');
console.log('  Phone:', phone || 'NOT SET');
console.log('');

if (!sid || !token || !phone) {
  console.log('⚠️  Twilio not fully configured - SMS will not work');
  console.log('   Need: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
  process.exit(0);
}

// Try to load the SMS client
try {
  const smsClient = require('../src/services/sms-client');
  console.log('✅ SMS Client loaded successfully');
  console.log('   sendSMS function:', typeof smsClient.sendSMS === 'function' ? 'Available' : 'Missing');
  console.log('   sendFallbackSMS:', typeof smsClient.sendFallbackSMS === 'function' ? 'Available' : 'Missing');
  console.log('   sendConfirmationSMS:', typeof smsClient.sendConfirmationSMS === 'function' ? 'Available' : 'Missing');
  console.log('   testConnection:', typeof smsClient.testConnection === 'function' ? 'Available' : 'Missing');
  
  // Test connection
  smsClient.testConnection().then(ok => {
    console.log('\n   Connection test:', ok ? '✅ Connected' : '❌ Failed');
  });
} catch (e) {
  console.log('❌ Failed to load SMS client:', e.message);
}

// To actually send a test SMS, uncomment below:
// async function testSend() {
//   const smsClient = require('../src/services/sms-client');
//   const result = await smsClient.sendSms('+44XXXXXXXXXX', 'Test from AsylumLaw AI');
//   console.log('SMS Result:', result);
// }
// testSend();

