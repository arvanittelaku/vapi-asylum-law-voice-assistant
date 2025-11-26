/**
 * Comprehensive Edge Case Tests
 * 
 * Tests all possible edge cases an AI assistant might encounter.
 * Run with: node scripts/test-edge-cases.js
 */

require('dotenv').config();
const vapiFunctionHandler = require('../src/webhooks/vapi-function-handler');
const ghlClient = require('../src/services/ghl-client');

const results = { passed: 0, failed: 0, tests: [] };

function log(message, type = 'info') {
  const colors = {
    pass: '\x1b[32m✅', fail: '\x1b[31m❌', warn: '\x1b[33m⚠️',
    info: '\x1b[36mℹ️', test: '\x1b[35m🧪', reset: '\x1b[0m'
  };
  console.log(`${colors[type] || ''} ${message}${colors.reset}`);
}

async function test(name, fn) {
  try {
    await fn();
    results.passed++;
    results.tests.push({ name, status: 'passed' });
    log(`PASS: ${name}`, 'pass');
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
    log(`FAIL: ${name} - ${error.message}`, 'fail');
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition, msg) {
  if (!condition) throw new Error(msg);
}

function assertContains(str, substr, msg) {
  if (!str || !str.includes(substr)) {
    throw new Error(`${msg}: "${str}" doesn't contain "${substr}"`);
  }
}

// Helper to create VAPI payload
function createPayload(functionName, parameters, metadata = {}) {
  return {
    message: {
      type: 'function-call',
      functionCall: { name: functionName, parameters }
    },
    call: { metadata }
  };
}

async function runEdgeCaseTests() {
  console.log('\n' + '🔬'.repeat(25));
  console.log('   EDGE CASE & STRESS TESTS');
  console.log('🔬'.repeat(25) + '\n');

  // ============================================
  // SECTION 1: PARAMETER VALIDATION
  // ============================================
  console.log('\n📋 SECTION 1: PARAMETER VALIDATION\n');

  await test('Empty parameters object', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('update_contact', {})
    );
    // Should not crash, may create minimal contact or return gracefully
    assertTrue(result !== null, 'Should return something');
  });

  await test('Null parameters', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('update_contact', null)
    );
    assertTrue(result !== null, 'Should handle null parameters');
  });

  await test('Undefined function name', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall({
      message: { type: 'function-call', functionCall: { name: undefined, parameters: {} } },
      call: { metadata: {} }
    });
    assertTrue(result.error, 'Should return error for undefined function');
  });

  await test('Very long string parameters', async () => {
    const longString = 'A'.repeat(10000);
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('update_contact', {
        firstName: 'Test',
        lastName: 'User',
        asylumReason: longString
      }, { customerPhone: '+447700900999' })
    );
    // Should handle or truncate, not crash
    assertTrue(result !== null, 'Should handle long strings');
  });

  await test('Special characters in name', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('update_contact', {
        firstName: "O'Connor-Smith",
        lastName: 'Müller',
        nationality: 'Côte d\'Ivoire'
      }, { customerPhone: '+447700900888' })
    );
    assertTrue(result.success === true || result.contactId, 'Should handle special chars');
  });

  await test('Unicode/Arabic characters', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('update_contact', {
        firstName: 'محمد',
        lastName: 'العربي',
        nationality: 'سوريا'
      }, { customerPhone: '+447700900777' })
    );
    assertTrue(result !== null, 'Should handle Arabic text');
  });

  await test('Empty string vs undefined', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('update_contact', {
        firstName: '',
        lastName: '',
        nationality: undefined,
        asylumReason: null
      }, { customerPhone: '+447700900666' })
    );
    assertTrue(result !== null, 'Should handle empty/null values');
  });

  // ============================================
  // SECTION 2: PHONE NUMBER FORMATS
  // ============================================
  console.log('\n📋 SECTION 2: PHONE NUMBER FORMATS\n');

  const phoneFormats = [
    { phone: '+447700900123', desc: 'UK with + prefix' },
    { phone: '07700900123', desc: 'UK without country code' },
    { phone: '+1-555-123-4567', desc: 'US with dashes' },
    { phone: '+93 70 123 4567', desc: 'Afghanistan with spaces' },
    { phone: '00447700900123', desc: 'UK with 00 prefix' },
    { phone: '+963123456789', desc: 'Syria' },
    { phone: '+964123456789', desc: 'Iraq' },
    { phone: '', desc: 'Empty phone' },
    { phone: 'invalid', desc: 'Invalid phone string' },
  ];

  for (const { phone, desc } of phoneFormats) {
    await test(`Phone format: ${desc}`, async () => {
      const result = await vapiFunctionHandler.handleFunctionCall(
        createPayload('update_contact', {
          firstName: 'Phone',
          lastName: 'Test'
        }, { customerPhone: phone })
      );
      // Should not crash regardless of format
      assertTrue(result !== null, 'Should handle phone format');
    });
  }

  // ============================================
  // SECTION 3: DATE/TIME FORMATS
  // ============================================
  console.log('\n📋 SECTION 3: DATE/TIME FORMATS\n');

  const dateFormats = [
    { date: '2025-11-28', desc: 'ISO format (correct)' },
    { date: '28/11/2025', desc: 'UK format DD/MM/YYYY' },
    { date: '11/28/2025', desc: 'US format MM/DD/YYYY' },
    { date: 'November 28, 2025', desc: 'Long format' },
    { date: 'tomorrow', desc: 'Relative date' },
    { date: 'next Monday', desc: 'Relative day' },
    { date: '', desc: 'Empty date' },
    { date: '2020-01-01', desc: 'Past date' },
    { date: '2030-01-01', desc: 'Far future date' },
    { date: '2025-11-29', desc: 'Saturday (weekend)' },
    { date: '2025-11-30', desc: 'Sunday (weekend)' },
  ];

  for (const { date, desc } of dateFormats) {
    await test(`Date format: ${desc}`, async () => {
      const result = await vapiFunctionHandler.handleFunctionCall(
        createPayload('check_calendar_availability', { date })
      );
      // Should handle gracefully
      assertTrue(result !== null, 'Should handle date format');
      assertTrue(result.success !== undefined, 'Should return success field');
    });
  }

  const timeFormats = [
    { time: '10:00', desc: '24h format' },
    { time: '10:00 AM', desc: '12h format with AM' },
    { time: '2:30 PM', desc: '12h format with PM' },
    { time: '14:30', desc: '24h afternoon' },
    { time: '9am', desc: 'Short format' },
    { time: '', desc: 'Empty time' },
    { time: '25:00', desc: 'Invalid hour' },
    { time: '10:99', desc: 'Invalid minutes' },
  ];

  for (const { time, desc } of timeFormats) {
    await test(`Time format: ${desc}`, async () => {
      const result = await vapiFunctionHandler.handleFunctionCall(
        createPayload('book_appointment', { date: '2025-11-28', time }, { contact_id: 'test123' })
      );
      // May fail due to contact_id but should not crash from time format
      assertTrue(result !== null, 'Should handle time format');
    });
  }

  // ============================================
  // SECTION 4: TRIAGE STATUS VALUES
  // ============================================
  console.log('\n📋 SECTION 4: TRIAGE STATUS VALUES\n');

  const triageValues = [
    'private-candidate',
    'legalaid',
    'pending',
    'PRIVATE',  // uppercase
    'legal aid',  // space
    'legal-aid',  // different format
    'unknown',
    '',
    null,
    'emergency',
    'referred',
  ];

  for (const status of triageValues) {
    await test(`Triage status: "${status}"`, async () => {
      const result = await vapiFunctionHandler.handleFunctionCall(
        createPayload('update_contact', {
          firstName: 'Triage',
          lastName: 'Test',
          triageStatus: status
        }, { customerPhone: '+447700900555' })
      );
      assertTrue(result !== null, 'Should handle triage status');
    });
  }

  // ============================================
  // SECTION 5: CONFIRMATION STATUS VALUES
  // ============================================
  console.log('\n📋 SECTION 5: CONFIRMATION STATUS VALUES\n');

  const confirmationValues = [
    'confirmed',
    'cancelled',
    'reschedule',
    'no_answer',
    'CONFIRMED',  // uppercase
    'Confirmed',  // mixed case
    'yes',  // informal
    'no',
    '',
    'maybe',
    'pending',
  ];

  for (const status of confirmationValues) {
    await test(`Confirmation status: "${status}"`, async () => {
      const result = await vapiFunctionHandler.handleFunctionCall(
        createPayload('update_confirmation_status', { status }, { contact_id: 'test123' })
      );
      // Will fail without real contact but should not crash
      assertTrue(result !== null, 'Should handle confirmation status');
    });
  }

  // ============================================
  // SECTION 6: EMERGENCY SCENARIOS
  // ============================================
  console.log('\n📋 SECTION 6: EMERGENCY SCENARIOS\n');

  const emergencyReasons = [
    'emergency',
    'detained',
    'deportation',
    'minor',
    'interpreter',
    'court_hearing',
    'immediate_danger',
    'medical_emergency',
    'violence',
    'persecution',
    '',
    'general_inquiry',
  ];

  const urgencyLevels = ['immediate', 'high', 'normal', 'low', '', 'URGENT', 'critical'];

  for (const reason of emergencyReasons) {
    await test(`Emergency reason: "${reason}"`, async () => {
      const result = await vapiFunctionHandler.handleFunctionCall(
        createPayload('transfer_to_human', {
          reason,
          urgency: 'immediate'
        })
      );
      assertTrue(result.success === true, 'Should handle emergency transfer');
    });
  }

  for (const urgency of urgencyLevels) {
    await test(`Urgency level: "${urgency}"`, async () => {
      const result = await vapiFunctionHandler.handleFunctionCall(
        createPayload('transfer_to_human', {
          reason: 'emergency',
          urgency
        })
      );
      assertTrue(result !== null, 'Should handle urgency level');
    });
  }

  // ============================================
  // SECTION 7: REFERRAL EMAIL EDGE CASES
  // ============================================
  console.log('\n📋 SECTION 7: REFERRAL EMAIL EDGE CASES\n');

  await test('Referral with minimal data', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('send_referral_email', {
        firstName: 'Min',
        lastName: 'Data',
        nationality: 'Unknown',
        asylumReason: 'Not specified'
      })
    );
    assertTrue(result.success === true, 'Should send with minimal data');
  });

  await test('Referral with complete data', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('send_referral_email', {
        firstName: 'Complete',
        lastName: 'Dataset',
        nationality: 'Syria',
        currentCountry: 'United Kingdom',
        ukEntryDate: '2024-06-15',
        immigrationStatus: 'Asylum seeker',
        asylumReason: 'Political persecution and violence due to activism',
        familyIncluded: 'yes',
        familyDetails: 'Wife (35), Son (10), Daughter (7)'
      })
    );
    assertTrue(result.success === true, 'Should send with complete data');
  });

  await test('Referral with HTML injection attempt', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('send_referral_email', {
        firstName: '<script>alert("xss")</script>',
        lastName: 'Test',
        nationality: 'Test',
        asylumReason: '<img src="x" onerror="alert(1)">'
      })
    );
    assertTrue(result !== null, 'Should handle HTML in parameters');
  });

  // ============================================
  // SECTION 8: CUSTOM FIELD MAPPING
  // ============================================
  console.log('\n📋 SECTION 8: CUSTOM FIELD MAPPING\n');

  await test('All custom fields populated', async () => {
    const allFields = {
      firstName: 'All',
      lastName: 'Fields',
      nationality: 'Afghanistan',
      currentCountry: 'United Kingdom',
      ukEntryDate: '2024-01-15',
      immigrationStatus: 'Asylum seeker',
      asylumReason: 'Political persecution',
      familyIncluded: 'yes',
      familyDetails: 'Wife and 2 children',
      preferredChannel: 'whatsapp',
      triageStatus: 'private-candidate',
      emergencyFlag: true,
      emergencyType: 'none',
      interpreterNeeded: true,
      interpreterLanguage: 'Pashto',
      fullName: 'All Fields Test'
    };

    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('update_contact', allFields, { customerPhone: '+447700900444' })
    );
    assertTrue(result.success === true, 'Should handle all fields');
  });

  await test('Boolean field as string "true"', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('update_contact', {
        firstName: 'Bool',
        lastName: 'Test',
        emergencyFlag: 'true',
        interpreterNeeded: 'yes'
      }, { customerPhone: '+447700900333' })
    );
    assertTrue(result !== null, 'Should handle string booleans');
  });

  // ============================================
  // SECTION 9: CONCURRENT OPERATIONS SIMULATION
  // ============================================
  console.log('\n📋 SECTION 9: CONCURRENT OPERATIONS\n');

  await test('Multiple simultaneous contact updates', async () => {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        vapiFunctionHandler.handleFunctionCall(
          createPayload('update_contact', {
            firstName: `Concurrent${i}`,
            lastName: 'Test'
          }, { customerPhone: `+4477009001${i}${i}` })
        )
      );
    }
    const results = await Promise.all(promises);
    const allSuccess = results.every(r => r.success === true || r.contactId);
    assertTrue(allSuccess, 'All concurrent updates should succeed');
  });

  // ============================================
  // SECTION 10: METADATA EDGE CASES
  // ============================================
  console.log('\n📋 SECTION 10: METADATA EDGE CASES\n');

  await test('Missing metadata object', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall({
      message: {
        type: 'function-call',
        functionCall: {
          name: 'update_contact',
          parameters: { firstName: 'No', lastName: 'Metadata' }
        }
      },
      call: {}
    });
    assertTrue(result !== null, 'Should handle missing metadata');
  });

  await test('Missing call object', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall({
      message: {
        type: 'function-call',
        functionCall: {
          name: 'update_contact',
          parameters: { firstName: 'No', lastName: 'Call' }
        }
      }
    });
    assertTrue(result !== null, 'Should handle missing call object');
  });

  await test('Extra unexpected metadata fields', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('update_contact', {
        firstName: 'Extra',
        lastName: 'Fields'
      }, {
        customerPhone: '+447700900222',
        unexpectedField: 'should be ignored',
        anotherRandom: { nested: 'object' },
        arrayField: [1, 2, 3]
      })
    );
    assertTrue(result !== null, 'Should ignore extra metadata');
  });

  // ============================================
  // SECTION 11: VAPI RESPONSE FORMAT VALIDATION
  // ============================================
  console.log('\n📋 SECTION 11: RESPONSE FORMAT VALIDATION\n');

  await test('Calendar response has voice-friendly message', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('check_calendar_availability', { date: '2025-11-28' })
    );
    assertTrue(typeof result.message === 'string', 'Should have message string');
    assertTrue(result.message.length > 0, 'Message should not be empty');
    // Check it's voice-friendly (no code, no JSON)
    assertTrue(!result.message.includes('{'), 'Message should not contain JSON');
  });

  await test('Booking response has confirmation message', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('book_appointment', { date: '2025-11-28', time: '10:00' }, { contact_id: 'test' })
    );
    // Will fail but should have proper error message
    assertTrue(typeof result.error === 'string' || typeof result.message === 'string', 
      'Should have message or error');
  });

  await test('Referral response mentions partner', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('send_referral_email', {
        firstName: 'Partner',
        lastName: 'Check',
        nationality: 'Test',
        asylumReason: 'Test'
      })
    );
    assertTrue(result.partner !== undefined, 'Should mention partner');
    assertContains(result.message, '48 hours', 'Should mention timeframe');
  });

  // ============================================
  // SECTION 12: BOUNDARY VALUES
  // ============================================
  console.log('\n📋 SECTION 12: BOUNDARY VALUES\n');

  await test('Zero-length strings everywhere', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('update_contact', {
        firstName: '',
        lastName: '',
        nationality: '',
        asylumReason: ''
      }, { customerPhone: '' })
    );
    assertTrue(result !== null, 'Should handle all empty strings');
  });

  await test('Maximum reasonable field lengths', async () => {
    const result = await vapiFunctionHandler.handleFunctionCall(
      createPayload('update_contact', {
        firstName: 'A'.repeat(100),
        lastName: 'B'.repeat(100),
        asylumReason: 'C'.repeat(5000),
        familyDetails: 'D'.repeat(2000)
      }, { customerPhone: '+447700900111' })
    );
    assertTrue(result !== null, 'Should handle long but reasonable lengths');
  });

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 EDGE CASE TEST SUMMARY');
  console.log('='.repeat(60));
  log(`Total Tests: ${results.passed + results.failed}`, 'info');
  log(`Passed: ${results.passed}`, results.passed > 0 ? 'pass' : 'info');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'fail' : 'pass');
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => t.status === 'failed').forEach(t => {
      log(`  ${t.name}: ${t.error}`, 'fail');
    });
  }
  
  console.log('='.repeat(60));
  
  const passRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
  console.log(`\n📈 Pass Rate: ${passRate}%\n`);
  
  return results;
}

runEdgeCaseTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });

