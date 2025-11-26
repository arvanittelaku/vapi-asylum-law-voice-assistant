/**
 * PRE-LAUNCH CHECKLIST
 * 
 * Run this before going live to verify everything is configured correctly.
 * 
 * Usage: node scripts/pre-launch-checklist.js
 */

require('dotenv').config();
const axios = require('axios');

const results = {
  critical: [],
  warnings: [],
  passed: []
};

function log(message, type = 'info') {
  const icons = {
    critical: '🔴 CRITICAL',
    warning: '🟡 WARNING',
    pass: '✅ PASS',
    info: 'ℹ️',
    check: '🔍'
  };
  console.log(`${icons[type] || ''} ${message}`);
}

function addResult(message, type) {
  if (type === 'critical') results.critical.push(message);
  else if (type === 'warning') results.warnings.push(message);
  else results.passed.push(message);
}

async function checkEnvironmentVariables() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 CHECKING ENVIRONMENT VARIABLES');
  console.log('='.repeat(60));

  const critical = [
    'VAPI_API_KEY',
    'VAPI_INTAKE_ASSISTANT_ID',
    'VAPI_EMERGENCY_ASSISTANT_ID', 
    'VAPI_CONFIRMATION_ASSISTANT_ID',
    'GHL_API_KEY',
    'GHL_LOCATION_ID',
    'GHL_CALENDAR_ID',
    'WEBHOOK_BASE_URL'
  ];

  const recommended = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'EMERGENCY_DUTY_PHONE',
    'LEGAL_AID_PARTNER_EMAIL',
    'TEAM_NOTIFICATION_EMAIL'
  ];

  // Check critical variables
  console.log('\nCritical Variables:');
  for (const key of critical) {
    const value = process.env[key];
    if (!value) {
      log(`${key}: NOT SET`, 'critical');
      addResult(`${key} is not set`, 'critical');
    } else if (value.includes('your_') || value.includes('placeholder') || value.includes('example')) {
      log(`${key}: PLACEHOLDER VALUE`, 'critical');
      addResult(`${key} has placeholder value`, 'critical');
    } else {
      log(`${key}: Set (${value.substring(0, 20)}...)`, 'pass');
      addResult(`${key} is configured`, 'pass');
    }
  }

  // Check recommended variables
  console.log('\nRecommended Variables:');
  for (const key of recommended) {
    const value = process.env[key];
    if (!value) {
      log(`${key}: NOT SET (optional)`, 'warning');
      addResult(`${key} not set - some features may not work`, 'warning');
    } else {
      log(`${key}: Set`, 'pass');
      addResult(`${key} is configured`, 'pass');
    }
  }
}

async function checkWebhookUrl() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 CHECKING WEBHOOK URL');
  console.log('='.repeat(60));

  const webhookUrl = process.env.WEBHOOK_BASE_URL;
  
  if (!webhookUrl) {
    log('WEBHOOK_BASE_URL is not set', 'critical');
    addResult('Webhook URL not configured', 'critical');
    return;
  }

  if (webhookUrl.includes('your-app-url') || webhookUrl.includes('placeholder') || webhookUrl.includes('example')) {
    log(`WEBHOOK_BASE_URL is still a placeholder: ${webhookUrl}`, 'critical');
    addResult('Webhook URL is placeholder - tools will fail!', 'critical');
    return;
  }

  if (webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
    log(`WEBHOOK_BASE_URL is localhost - won't work for VAPI`, 'critical');
    addResult('Webhook URL is localhost - must be public URL', 'critical');
    return;
  }

  // Try to reach the webhook
  try {
    const response = await axios.get(`${webhookUrl}/health`, { timeout: 10000 });
    if (response.data.status === 'healthy') {
      log(`Webhook URL is reachable: ${webhookUrl}`, 'pass');
      addResult('Webhook URL is live and healthy', 'pass');
    } else {
      log(`Webhook responded but status unclear`, 'warning');
      addResult('Webhook responded but verify manually', 'warning');
    }
  } catch (error) {
    log(`Cannot reach webhook: ${error.message}`, 'critical');
    addResult(`Webhook URL not reachable: ${error.message}`, 'critical');
  }
}

async function checkVapiAssistants() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 CHECKING VAPI ASSISTANTS');
  console.log('='.repeat(60));

  const assistants = [
    { name: 'Intake', id: process.env.VAPI_INTAKE_ASSISTANT_ID },
    { name: 'Emergency', id: process.env.VAPI_EMERGENCY_ASSISTANT_ID },
    { name: 'Confirmation', id: process.env.VAPI_CONFIRMATION_ASSISTANT_ID }
  ];

  const webhookUrl = process.env.WEBHOOK_BASE_URL;

  for (const assistant of assistants) {
    if (!assistant.id) {
      log(`${assistant.name} Assistant: ID not set`, 'critical');
      addResult(`${assistant.name} Assistant ID missing`, 'critical');
      continue;
    }

    try {
      const response = await axios.get(
        `https://api.vapi.ai/assistant/${assistant.id}`,
        { headers: { 'Authorization': `Bearer ${process.env.VAPI_API_KEY}` } }
      );

      const tools = response.data.model?.tools || [];
      console.log(`\n${assistant.name} Assistant (${tools.length} tools):`);

      let allUrlsCorrect = true;
      for (const tool of tools) {
        const toolUrl = tool.server?.url || 'No URL';
        const toolName = tool.function?.name;
        
        if (webhookUrl && toolUrl.includes(webhookUrl.replace('https://', '').replace('http://', ''))) {
          log(`  ${toolName}: ✅ Correct URL`, 'pass');
        } else if (toolUrl.includes('your-app-url') || toolUrl.includes('placeholder')) {
          log(`  ${toolName}: ❌ PLACEHOLDER URL`, 'critical');
          allUrlsCorrect = false;
        } else {
          log(`  ${toolName}: ⚠️ URL: ${toolUrl.substring(0, 40)}...`, 'warning');
          allUrlsCorrect = false;
        }
      }

      if (allUrlsCorrect) {
        addResult(`${assistant.name} Assistant tools configured correctly`, 'pass');
      } else {
        addResult(`${assistant.name} Assistant has incorrect tool URLs - run npm run deploy:all`, 'critical');
      }

    } catch (error) {
      log(`${assistant.name} Assistant: Error fetching - ${error.message}`, 'critical');
      addResult(`Cannot verify ${assistant.name} Assistant`, 'critical');
    }
  }
}

async function checkGhlConnection() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 CHECKING GHL CONNECTION');
  console.log('='.repeat(60));

  if (!process.env.GHL_API_KEY) {
    log('GHL API Key not set', 'critical');
    addResult('GHL API Key missing', 'critical');
    return;
  }

  try {
    // Try to fetch contacts (minimal test)
    const response = await axios.get(
      'https://services.leadconnectorhq.com/contacts/',
      {
        headers: {
          'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
          'Version': '2021-07-28'
        },
        params: {
          locationId: process.env.GHL_LOCATION_ID,
          limit: 1
        }
      }
    );
    
    log('GHL API connection successful', 'pass');
    addResult('GHL API connection working', 'pass');
  } catch (error) {
    if (error.response?.status === 401) {
      log('GHL API Key invalid or expired', 'critical');
      addResult('GHL API authentication failed', 'critical');
    } else {
      log(`GHL API error: ${error.message}`, 'warning');
      addResult('GHL API test inconclusive', 'warning');
    }
  }
}

async function checkVapiPhoneNumbers() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 CHECKING VAPI PHONE NUMBERS');
  console.log('='.repeat(60));

  try {
    const response = await axios.get(
      'https://api.vapi.ai/phone-number',
      { headers: { 'Authorization': `Bearer ${process.env.VAPI_API_KEY}` } }
    );

    const phoneNumbers = response.data || [];
    
    if (phoneNumbers.length === 0) {
      log('No phone numbers configured in VAPI', 'critical');
      addResult('No VAPI phone number - cannot receive calls', 'critical');
    } else {
      console.log(`Found ${phoneNumbers.length} phone number(s):`);
      phoneNumbers.forEach(pn => {
        const assigned = pn.assistantId ? `→ ${pn.assistantId.substring(0, 8)}...` : '(not assigned)';
        log(`  ${pn.number || pn.id}: ${assigned}`, pn.assistantId ? 'pass' : 'warning');
      });

      const hasAssigned = phoneNumbers.some(pn => pn.assistantId);
      if (hasAssigned) {
        addResult('Phone number configured and assigned', 'pass');
      } else {
        addResult('Phone number exists but not assigned to assistant', 'warning');
      }
    }
  } catch (error) {
    log(`Cannot check phone numbers: ${error.message}`, 'warning');
    addResult('Phone number check failed', 'warning');
  }
}

async function checkGhlWorkflows() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 CHECKING GHL WORKFLOWS');
  console.log('='.repeat(60));

  const expectedWorkflows = [
    'Initial Call Workflow',
    'Confirmation Call Workflow',
    'Private Candidate Follow-up',
    'Legal Aid Referral',
    'No Answer (SMS Fallback)',
    'Emergency Alert',
    'Confirmed Appointment'
  ];

  log('Expected GHL Workflows (verify manually in GHL):', 'info');
  expectedWorkflows.forEach((wf, i) => {
    console.log(`  ${i + 1}. ${wf}`);
  });

  log('\n⚠️ Cannot verify GHL workflows via API - check manually', 'warning');
  addResult('GHL workflows should be verified manually', 'warning');
}

async function runFinalSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL PRE-LAUNCH SUMMARY');
  console.log('='.repeat(60));

  // Critical issues
  if (results.critical.length > 0) {
    console.log('\n🔴 CRITICAL ISSUES (must fix before launch):');
    results.critical.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }

  // Warnings
  if (results.warnings.length > 0) {
    console.log('\n🟡 WARNINGS (should review):');
    results.warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
  }

  // Passed
  console.log(`\n✅ PASSED: ${results.passed.length} checks`);

  // Final verdict
  console.log('\n' + '='.repeat(60));
  if (results.critical.length === 0) {
    console.log('🚀 GO FOR LAUNCH! All critical checks passed.');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Make a test call to the VAPI phone number');
    console.log('2. Run through each scenario (intake, emergency, confirmation)');
    console.log('3. Verify data appears in GHL');
    console.log('4. Monitor first few real calls closely');
  } else {
    console.log('❌ NOT READY FOR LAUNCH');
    console.log('='.repeat(60));
    console.log(`\nFix ${results.critical.length} critical issue(s) before going live.`);
    console.log('\nCommon fixes:');
    console.log('1. Deploy server to get public URL');
    console.log('2. Update WEBHOOK_BASE_URL in .env');
    console.log('3. Run: npm run deploy:all');
    console.log('4. Configure VAPI phone number');
  }
  console.log('');
}

async function main() {
  console.log('\n' + '🚀'.repeat(20));
  console.log('   ASYLUMLAW PRE-LAUNCH CHECKLIST');
  console.log('🚀'.repeat(20));

  await checkEnvironmentVariables();
  await checkWebhookUrl();
  await checkVapiAssistants();
  await checkGhlConnection();
  await checkVapiPhoneNumbers();
  await checkGhlWorkflows();
  await runFinalSummary();
}

main().catch(err => {
  console.error('Checklist error:', err);
  process.exit(1);
});

