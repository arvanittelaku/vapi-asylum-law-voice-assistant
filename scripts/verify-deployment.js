/**
 * Verify Deployment
 * 
 * Checks that all components are properly configured and connected.
 * Run: npm run verify
 */

require('dotenv').config();
const vapiClient = require('../src/services/vapi-client');
const ghlClient = require('../src/services/ghl-client');
const smsClient = require('../src/services/sms-client');

async function verifyDeployment() {
  console.log('============================================');
  console.log('  ASYLUMLAW VOICE ASSISTANT - VERIFICATION');
  console.log('============================================');
  console.log('');

  let allPassed = true;
  const results = [];

  // Check environment variables
  console.log('📋 Checking Environment Variables...');
  const requiredEnvVars = [
    'VAPI_API_KEY',
    'GHL_API_KEY',
    'GHL_LOCATION_ID',
    'GHL_CALENDAR_ID',
    'WEBHOOK_BASE_URL'
  ];

  const optionalEnvVars = [
    'VAPI_INTAKE_ASSISTANT_ID',
    'VAPI_EMERGENCY_ASSISTANT_ID',
    'VAPI_CONFIRMATION_ASSISTANT_ID',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN'
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      results.push({ name: `ENV: ${envVar}`, status: '✅', message: 'Set' });
    } else {
      results.push({ name: `ENV: ${envVar}`, status: '❌', message: 'MISSING' });
      allPassed = false;
    }
  }

  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      results.push({ name: `ENV: ${envVar}`, status: '✅', message: 'Set' });
    } else {
      results.push({ name: `ENV: ${envVar}`, status: '⚠️', message: 'Not set (optional)' });
    }
  }

  // Test VAPI connection
  console.log('🔌 Testing VAPI Connection...');
  try {
    const vapiConnected = await vapiClient.testConnection();
    results.push({ 
      name: 'VAPI API Connection', 
      status: vapiConnected ? '✅' : '❌', 
      message: vapiConnected ? 'Connected' : 'Failed' 
    });
    if (!vapiConnected) allPassed = false;
  } catch (error) {
    results.push({ name: 'VAPI API Connection', status: '❌', message: error.message });
    allPassed = false;
  }

  // Verify assistants exist
  console.log('🤖 Checking Assistants...');
  const assistantIds = [
    { name: 'Intake Assistant', id: process.env.VAPI_INTAKE_ASSISTANT_ID },
    { name: 'Emergency Assistant', id: process.env.VAPI_EMERGENCY_ASSISTANT_ID },
    { name: 'Confirmation Assistant', id: process.env.VAPI_CONFIRMATION_ASSISTANT_ID }
  ];

  for (const { name, id } of assistantIds) {
    if (!id) {
      results.push({ name, status: '⚠️', message: 'Not deployed yet' });
    } else {
      try {
        const assistant = await vapiClient.getAssistant(id);
        results.push({ name, status: '✅', message: `ID: ${id.substring(0, 8)}...` });
      } catch (error) {
        results.push({ name, status: '❌', message: 'Not found in VAPI' });
        allPassed = false;
      }
    }
  }

  // Test GHL connection
  console.log('📊 Testing GHL Connection...');
  try {
    const ghlConnected = await ghlClient.testConnection();
    results.push({ 
      name: 'GHL API Connection', 
      status: ghlConnected ? '✅' : '❌', 
      message: ghlConnected ? 'Connected' : 'Failed' 
    });
    if (!ghlConnected) allPassed = false;
  } catch (error) {
    results.push({ name: 'GHL API Connection', status: '❌', message: error.message });
    allPassed = false;
  }

  // Test Twilio connection
  console.log('📱 Testing Twilio Connection...');
  try {
    const twilioConnected = await smsClient.testConnection();
    results.push({ 
      name: 'Twilio SMS Connection', 
      status: twilioConnected ? '✅' : '⚠️', 
      message: twilioConnected ? 'Connected' : 'Not configured' 
    });
  } catch (error) {
    results.push({ name: 'Twilio SMS Connection', status: '⚠️', message: 'Not configured' });
  }

  // Check webhook URL
  console.log('🌐 Checking Webhook URL...');
  const webhookUrl = process.env.WEBHOOK_BASE_URL;
  if (webhookUrl) {
    if (webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
      results.push({ 
        name: 'Webhook URL', 
        status: '⚠️', 
        message: 'Using localhost - deploy for production' 
      });
    } else {
      results.push({ name: 'Webhook URL', status: '✅', message: webhookUrl });
    }
  } else {
    results.push({ name: 'Webhook URL', status: '❌', message: 'Not set' });
    allPassed = false;
  }

  // Print results
  console.log('');
  console.log('============================================');
  console.log('  VERIFICATION RESULTS');
  console.log('============================================');
  console.log('');

  for (const result of results) {
    console.log(`  ${result.status} ${result.name}`);
    if (result.message) {
      console.log(`     └─ ${result.message}`);
    }
  }

  console.log('');
  console.log('============================================');
  
  if (allPassed) {
    console.log('  ✅ ALL CHECKS PASSED');
    console.log('  Your system is ready for production!');
  } else {
    console.log('  ⚠️  SOME CHECKS FAILED');
    console.log('  Please fix the issues above before going live.');
  }
  
  console.log('============================================');
  console.log('');

  return allPassed;
}

// Run if called directly
if (require.main === module) {
  verifyDeployment().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}

module.exports = verifyDeployment;

