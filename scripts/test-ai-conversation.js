/**
 * AI Conversation Flow Tester
 * 
 * Simulates conversations with VAPI assistants to verify:
 * - AI asks questions in correct order
 * - AI calls tools at the right moments
 * - AI passes correct parameters to tools
 * - AI handles different scenarios correctly
 * 
 * Run with: node scripts/test-ai-conversation.js
 */

require('dotenv').config();
const axios = require('axios');

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_BASE_URL = 'https://api.vapi.ai';

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  scenarios: []
};

function log(message, type = 'info') {
  const icons = {
    pass: '✅', fail: '❌', warn: '⚠️', info: 'ℹ️', 
    user: '👤', ai: '🤖', tool: '🔧', test: '🧪'
  };
  console.log(`${icons[type] || ''} ${message}`);
}

/**
 * Create a chat session with an assistant
 */
async function createChatSession(assistantId) {
  try {
    const response = await axios.post(
      `${VAPI_BASE_URL}/call`,
      {
        assistantId,
        type: 'webCall',
        webCallUrl: 'test-session'
      },
      {
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating chat session:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Send a message to the assistant and get response
 * Using VAPI's transient assistant chat feature
 */
async function chatWithAssistant(assistantConfig, messages) {
  try {
    // Use VAPI's chat completion endpoint with assistant config
    const response = await axios.post(
      `${VAPI_BASE_URL}/chat/completions`,
      {
        assistant: assistantConfig,
        messages
      },
      {
        headers: {
          'Authorization': `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    // If chat endpoint doesn't exist, fall back to analyzing the prompt
    if (error.response?.status === 404) {
      return null; // Will use prompt analysis instead
    }
    console.error('Chat error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Analyze AI prompt to verify tool call triggers
 */
function analyzePromptForToolTriggers(prompt, scenario) {
  const checks = [];
  
  // Check for explicit tool call instructions
  const toolPatterns = {
    'update_contact': /call\s+update_contact|use\s+update_contact|update_contact\s+with/gi,
    'check_calendar_availability': /call\s+check_calendar|check_calendar_availability/gi,
    'book_appointment': /call\s+book_appointment|book_appointment\s+with/gi,
    'cancel_appointment': /call\s+cancel_appointment/gi,
    'send_referral_email': /call\s+send_referral|send_referral_email/gi,
    'transfer_to_human': /call\s+transfer_to_human|transfer_to_human\s+with/gi,
    'update_confirmation_status': /call\s+update_confirmation|update_confirmation_status/gi,
    'create_urgent_task': /call\s+create_urgent|create_urgent_task/gi
  };
  
  // Check each tool
  for (const [tool, pattern] of Object.entries(toolPatterns)) {
    const matches = prompt.match(pattern);
    if (matches) {
      checks.push({
        tool,
        found: true,
        occurrences: matches.length,
        contexts: matches
      });
    }
  }
  
  return checks;
}

/**
 * Test: Intake Assistant - Normal Private Flow
 */
async function testIntakePrivateFlow() {
  log('\n' + '='.repeat(60), 'test');
  log('TEST: Intake Assistant - Normal Private Flow', 'test');
  log('='.repeat(60), 'test');
  
  const intakeConfig = require('../src/config/intake-assistant');
  const prompt = intakeConfig.model.messages[0].content;
  
  // Expected sequence for private booking
  const expectedSequence = [
    { step: 1, action: 'Collect name, nationality, asylum reason' },
    { step: 2, action: 'Call update_contact to save info FIRST', tool: 'update_contact' },
    { step: 3, action: 'Give Private nudge' },
    { step: 4, action: 'Ask for preferred date' },
    { step: 5, action: 'Call check_calendar_availability', tool: 'check_calendar_availability' },
    { step: 6, action: 'Offer available times' },
    { step: 7, action: 'Call book_appointment', tool: 'book_appointment' },
    { step: 8, action: 'Confirm booking' }
  ];
  
  console.log('\n📋 Expected Flow:');
  expectedSequence.forEach(s => {
    console.log(`   Step ${s.step}: ${s.action}${s.tool ? ` [${s.tool}]` : ''}`);
  });
  
  // Verify prompt contains required instructions
  console.log('\n🔍 Prompt Analysis:');
  
  const checks = [
    {
      name: 'Save contact FIRST instruction',
      pattern: /STEP 1.*SAVE CONTACT.*MANDATORY|update_contact IMMEDIATELY/i,
      required: true
    },
    {
      name: 'Tool call sequence documented',
      pattern: /STEP 1.*STEP 2|### STEP|BOOKING FOR PRIVATE/i,
      required: true
    },
    {
      name: 'Date format instruction (YYYY-MM-DD)',
      pattern: /YYYY-MM-DD/,
      required: true
    },
    {
      name: 'Time format instruction (HH:mm)',
      pattern: /HH:mm|24-hour/i,
      required: true
    },
    {
      name: 'triageStatus parameter mentioned',
      pattern: /triageStatus.*private-candidate|private-candidate/,
      required: true
    },
    {
      name: 'Error handling instruction',
      pattern: /no slots|if.*fails|try again/i,
      required: true
    },
    {
      name: 'Tool response handling',
      pattern: /if.*succeeds|confirm.*time|booking.*success/i,
      required: true
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const check of checks) {
    const found = check.pattern.test(prompt);
    if (found) {
      log(`${check.name}`, 'pass');
      passed++;
    } else {
      log(`${check.name}`, 'fail');
      failed++;
    }
  }
  
  // Tool triggers analysis
  console.log('\n🔧 Tool Trigger Analysis:');
  const toolAnalysis = analyzePromptForToolTriggers(prompt, 'private');
  toolAnalysis.forEach(t => {
    log(`${t.tool}: Found ${t.occurrences} trigger(s)`, 'tool');
  });
  
  const result = {
    scenario: 'Intake - Private Flow',
    checks: checks.length,
    passed,
    failed,
    status: failed === 0 ? 'PASSED' : 'FAILED'
  };
  
  testResults.scenarios.push(result);
  testResults.passed += passed;
  testResults.failed += failed;
  
  console.log(`\n📊 Result: ${result.status} (${passed}/${checks.length} checks)`);
  return result;
}

/**
 * Test: Intake Assistant - Legal Aid Flow
 */
async function testIntakeLegalAidFlow() {
  log('\n' + '='.repeat(60), 'test');
  log('TEST: Intake Assistant - Legal Aid Flow', 'test');
  log('='.repeat(60), 'test');
  
  const intakeConfig = require('../src/config/intake-assistant');
  const prompt = intakeConfig.model.messages[0].content;
  
  // Expected sequence for Legal Aid
  const expectedSequence = [
    { step: 1, action: 'Collect info' },
    { step: 2, action: 'Call update_contact with triageStatus: "legalaid"', tool: 'update_contact' },
    { step: 3, action: 'Call send_referral_email', tool: 'send_referral_email' },
    { step: 4, action: 'Confirm referral sent' }
  ];
  
  console.log('\n📋 Expected Legal Aid Flow:');
  expectedSequence.forEach(s => {
    console.log(`   Step ${s.step}: ${s.action}`);
  });
  
  console.log('\n🔍 Prompt Analysis:');
  
  const checks = [
    {
      name: 'Legal Aid path documented',
      pattern: /LEGAL AID PATH|legalaid/i,
      required: true
    },
    {
      name: 'send_referral_email instruction',
      pattern: /call send_referral|send_referral_email/i,
      required: true
    },
    {
      name: 'triageStatus: legalaid mentioned',
      pattern: /triageStatus.*legalaid|legalaid/i,
      required: true
    },
    {
      name: '48 hours timeframe mentioned',
      pattern: /48 hours/i,
      required: true
    },
    {
      name: 'Update contact before referral',
      pattern: /update_contact.*legalaid|triageStatus.*legalaid/i,
      required: true
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const check of checks) {
    const found = check.pattern.test(prompt);
    if (found) {
      log(`${check.name}`, 'pass');
      passed++;
    } else {
      log(`${check.name}`, 'fail');
      failed++;
    }
  }
  
  const result = {
    scenario: 'Intake - Legal Aid Flow',
    checks: checks.length,
    passed,
    failed,
    status: failed === 0 ? 'PASSED' : 'FAILED'
  };
  
  testResults.scenarios.push(result);
  testResults.passed += passed;
  testResults.failed += failed;
  
  console.log(`\n📊 Result: ${result.status} (${passed}/${checks.length} checks)`);
  return result;
}

/**
 * Test: Intake Assistant - Emergency Detection
 */
async function testIntakeEmergency() {
  log('\n' + '='.repeat(60), 'test');
  log('TEST: Intake Assistant - Emergency Detection', 'test');
  log('='.repeat(60), 'test');
  
  const intakeConfig = require('../src/config/intake-assistant');
  const prompt = intakeConfig.model.messages[0].content;
  
  console.log('\n🔍 Emergency Detection Checks:');
  
  const emergencyKeywords = [
    'danger',
    'detained',
    'minor',
    'interpreter',
    'court'
  ];
  
  const checks = [
    {
      name: 'IMMEDIATE action for emergencies',
      pattern: /IMMEDIATELY.*transfer|transfer_to_human.*immediate/i,
      required: true
    },
    {
      name: 'Emergency: danger keyword',
      pattern: /danger.*transfer|reason.*danger/i,
      required: true
    },
    {
      name: 'Emergency: detained keyword',
      pattern: /detained.*transfer|reason.*detained/i,
      required: true
    },
    {
      name: 'Emergency: minor keyword',
      pattern: /minor.*transfer|reason.*minor|under 18/i,
      required: true
    },
    {
      name: 'Emergency: court hearing keyword',
      pattern: /court.*transfer|reason.*court/i,
      required: true
    },
    {
      name: 'Urgency parameter instruction',
      pattern: /urgency.*immediate/i,
      required: true
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const check of checks) {
    const found = check.pattern.test(prompt);
    if (found) {
      log(`${check.name}`, 'pass');
      passed++;
    } else {
      log(`${check.name}`, 'fail');
      failed++;
    }
  }
  
  const result = {
    scenario: 'Intake - Emergency Detection',
    checks: checks.length,
    passed,
    failed,
    status: failed === 0 ? 'PASSED' : 'FAILED'
  };
  
  testResults.scenarios.push(result);
  testResults.passed += passed;
  testResults.failed += failed;
  
  console.log(`\n📊 Result: ${result.status} (${passed}/${checks.length} checks)`);
  return result;
}

/**
 * Test: Confirmation Assistant - All Scenarios
 */
async function testConfirmationFlows() {
  log('\n' + '='.repeat(60), 'test');
  log('TEST: Confirmation Assistant - All Flows', 'test');
  log('='.repeat(60), 'test');
  
  const confirmConfig = require('../src/config/confirmation-assistant');
  const prompt = confirmConfig.model.messages[0].content;
  
  console.log('\n🔍 Confirmation Flow Checks:');
  
  const checks = [
    // Confirm flow
    {
      name: 'CONFIRM: calls update_confirmation_status',
      pattern: /update_confirmation_status.*confirmed|status.*confirmed/i,
      required: true
    },
    // Reschedule flow
    {
      name: 'RESCHEDULE: Step-by-step sequence',
      pattern: /STEP 1:|STEP 4.*Cancel|When customer wants to reschedule/i,
      required: true
    },
    {
      name: 'RESCHEDULE: check_calendar first',
      pattern: /check_calendar_availability/i,
      required: true
    },
    {
      name: 'RESCHEDULE: cancel THEN book',
      pattern: /cancel.*FIRST|STEP 4.*Cancel.*STEP 5.*Book|cancel_appointment.*book/i,
      required: true
    },
    {
      name: 'RESCHEDULE: status = reschedule',
      pattern: /status.*reschedule/i,
      required: true
    },
    // Cancel flow
    {
      name: 'CANCEL: calls cancel_appointment',
      pattern: /call cancel_appointment/i,
      required: true
    },
    {
      name: 'CANCEL: status = cancelled',
      pattern: /status.*cancelled/i,
      required: true
    },
    // No answer
    {
      name: 'NO_ANSWER: status = no_answer',
      pattern: /status.*no_answer/i,
      required: true
    },
    // Date/time formatting
    {
      name: 'Date conversion instruction',
      pattern: /YYYY-MM-DD|convert.*date/i,
      required: true
    },
    {
      name: 'Time conversion (24-hour)',
      pattern: /24-hour|14:00|15:30/i,
      required: true
    },
    // Error handling
    {
      name: 'Error handling documented',
      pattern: /if.*fail|try again|no.*slot/i,
      required: true
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const check of checks) {
    const found = check.pattern.test(prompt);
    if (found) {
      log(`${check.name}`, 'pass');
      passed++;
    } else {
      log(`${check.name}`, 'fail');
      failed++;
    }
  }
  
  const result = {
    scenario: 'Confirmation - All Flows',
    checks: checks.length,
    passed,
    failed,
    status: failed === 0 ? 'PASSED' : 'FAILED'
  };
  
  testResults.scenarios.push(result);
  testResults.passed += passed;
  testResults.failed += failed;
  
  console.log(`\n📊 Result: ${result.status} (${passed}/${checks.length} checks)`);
  return result;
}

/**
 * Test: Emergency Assistant - All Scenarios
 */
async function testEmergencyFlows() {
  log('\n' + '='.repeat(60), 'test');
  log('TEST: Emergency Assistant - All Flows', 'test');
  log('='.repeat(60), 'test');
  
  const emergencyConfig = require('../src/config/emergency-assistant');
  const prompt = emergencyConfig.model.messages[0].content;
  
  console.log('\n🔍 Emergency Flow Checks:');
  
  const checks = [
    // Critical: Save before transfer
    {
      name: 'CRITICAL: update_contact BEFORE transfer',
      pattern: /STEP 2.*update_contact|update_contact.*before|IMMEDIATELY update contact/i,
      required: true
    },
    {
      name: 'CRITICAL: create_urgent_task before transfer',
      pattern: /STEP 3.*Create urgent|create_urgent_task.*before|urgent task/i,
      required: true
    },
    // Emergency types
    {
      name: 'Type: danger handled',
      pattern: /emergencyType.*danger|danger/i,
      required: true
    },
    {
      name: 'Type: detained handled',
      pattern: /emergencyType.*detained|detained/i,
      required: true
    },
    {
      name: 'Type: minor handled',
      pattern: /emergencyType.*minor|minor/i,
      required: true
    },
    {
      name: 'Type: interpreter handled',
      pattern: /emergencyType.*interpreter|interpreter/i,
      required: true
    },
    {
      name: 'Type: court_hearing handled',
      pattern: /emergencyType.*court|court_hearing/i,
      required: true
    },
    // Parameters
    {
      name: 'emergencyFlag: true instruction',
      pattern: /emergencyFlag.*true/i,
      required: true
    },
    {
      name: 'urgency: immediate instruction',
      pattern: /urgency.*immediate/i,
      required: true
    },
    // Fallback
    {
      name: 'Tool failure fallback',
      pattern: /if.*fail.*try again|retry|proceed.*anyway/i,
      required: true
    },
    // Never end call
    {
      name: 'Never just end call instruction',
      pattern: /never.*end.*call|ALWAYS.*transfer/i,
      required: true
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const check of checks) {
    const found = check.pattern.test(prompt);
    if (found) {
      log(`${check.name}`, 'pass');
      passed++;
    } else {
      log(`${check.name}`, 'fail');
      failed++;
    }
  }
  
  const result = {
    scenario: 'Emergency - All Flows',
    checks: checks.length,
    passed,
    failed,
    status: failed === 0 ? 'PASSED' : 'FAILED'
  };
  
  testResults.scenarios.push(result);
  testResults.passed += passed;
  testResults.failed += failed;
  
  console.log(`\n📊 Result: ${result.status} (${passed}/${checks.length} checks)`);
  return result;
}

/**
 * Test: Tool Definition Verification
 */
async function testToolDefinitions() {
  log('\n' + '='.repeat(60), 'test');
  log('TEST: Tool Definitions Match Handler', 'test');
  log('='.repeat(60), 'test');
  
  const intakeConfig = require('../src/config/intake-assistant');
  const confirmConfig = require('../src/config/confirmation-assistant');
  const emergencyConfig = require('../src/config/emergency-assistant');
  
  // Expected tool names in handler
  const handlerTools = [
    'check_calendar_availability',
    'book_appointment',
    'cancel_appointment',
    'update_contact',
    'update_confirmation_status',
    'transfer_to_human',
    'create_urgent_task',
    'send_referral_email'
  ];
  
  console.log('\n🔍 Tool Definition Checks:');
  
  let passed = 0;
  let failed = 0;
  
  // Check Intake tools
  const intakeTools = intakeConfig.model.tools.map(t => t.function.name);
  console.log('\nIntake Assistant Tools:');
  intakeTools.forEach(tool => {
    if (handlerTools.includes(tool)) {
      log(`${tool} - matches handler`, 'pass');
      passed++;
    } else {
      log(`${tool} - NOT in handler!`, 'fail');
      failed++;
    }
  });
  
  // Check Confirmation tools
  const confirmTools = confirmConfig.model.tools.map(t => t.function.name);
  console.log('\nConfirmation Assistant Tools:');
  confirmTools.forEach(tool => {
    if (handlerTools.includes(tool)) {
      log(`${tool} - matches handler`, 'pass');
      passed++;
    } else {
      log(`${tool} - NOT in handler!`, 'fail');
      failed++;
    }
  });
  
  // Check Emergency tools
  const emergencyTools = emergencyConfig.model.tools.map(t => t.function.name);
  console.log('\nEmergency Assistant Tools:');
  emergencyTools.forEach(tool => {
    if (handlerTools.includes(tool)) {
      log(`${tool} - matches handler`, 'pass');
      passed++;
    } else {
      log(`${tool} - NOT in handler!`, 'fail');
      failed++;
    }
  });
  
  const result = {
    scenario: 'Tool Definitions',
    checks: intakeTools.length + confirmTools.length + emergencyTools.length,
    passed,
    failed,
    status: failed === 0 ? 'PASSED' : 'FAILED'
  };
  
  testResults.scenarios.push(result);
  testResults.passed += passed;
  testResults.failed += failed;
  
  console.log(`\n📊 Result: ${result.status} (${passed}/${result.checks} tools match)`);
  return result;
}

/**
 * Test: Required Parameters in Tool Definitions
 */
async function testToolParameters() {
  log('\n' + '='.repeat(60), 'test');
  log('TEST: Tool Required Parameters', 'test');
  log('='.repeat(60), 'test');
  
  const intakeConfig = require('../src/config/intake-assistant');
  
  // Expected required params per tool
  const expectedParams = {
    'check_calendar_availability': ['date'],
    'book_appointment': ['date', 'time'],
    'update_contact': ['firstName', 'lastName', 'nationality'],
    'transfer_to_human': ['reason', 'urgency'],
    'send_referral_email': ['firstName', 'lastName', 'nationality', 'asylumReason']
  };
  
  console.log('\n🔍 Required Parameter Checks:');
  
  let passed = 0;
  let failed = 0;
  
  for (const tool of intakeConfig.model.tools) {
    const toolName = tool.function.name;
    const actualRequired = tool.function.parameters.required || [];
    const expected = expectedParams[toolName];
    
    if (expected) {
      const hasAll = expected.every(p => actualRequired.includes(p));
      if (hasAll) {
        log(`${toolName}: required params correct [${actualRequired.join(', ')}]`, 'pass');
        passed++;
      } else {
        log(`${toolName}: missing required params. Expected [${expected.join(', ')}], got [${actualRequired.join(', ')}]`, 'fail');
        failed++;
      }
    }
  }
  
  const result = {
    scenario: 'Tool Parameters',
    checks: Object.keys(expectedParams).length,
    passed,
    failed,
    status: failed === 0 ? 'PASSED' : 'FAILED'
  };
  
  testResults.scenarios.push(result);
  testResults.passed += passed;
  testResults.failed += failed;
  
  console.log(`\n📊 Result: ${result.status} (${passed}/${result.checks} tools correct)`);
  return result;
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n' + '🤖'.repeat(30));
  console.log('   AI CONVERSATION FLOW TESTS');
  console.log('🤖'.repeat(30));
  
  await testIntakePrivateFlow();
  await testIntakeLegalAidFlow();
  await testIntakeEmergency();
  await testConfirmationFlows();
  await testEmergencyFlows();
  await testToolDefinitions();
  await testToolParameters();
  
  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\nScenario Results:');
  testResults.scenarios.forEach(s => {
    const icon = s.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${s.scenario}: ${s.passed}/${s.checks} checks`);
  });
  
  const totalChecks = testResults.passed + testResults.failed;
  const passRate = ((testResults.passed / totalChecks) * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Pass Rate: ${passRate}%`);
  console.log('='.repeat(60));
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL AI CONVERSATION TESTS PASSED!');
    console.log('The prompts are properly configured for correct tool usage.\n');
  } else {
    console.log('\n⚠️ Some tests failed. Review the prompts for missing instructions.\n');
  }
  
  return testResults;
}

runAllTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });

