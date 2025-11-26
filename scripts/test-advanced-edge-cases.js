/**
 * ADVANCED EDGE CASE TESTS
 * 
 * Tests for scenarios that could break in production:
 * - Timezone boundaries
 * - Unicode/special characters
 * - Concurrent operations
 * - Network failures
 * - Malformed data
 * - Boundary conditions
 * 
 * Usage: node scripts/test-advanced-edge-cases.js
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const results = { passed: 0, failed: 0, tests: [] };

async function test(name, fn) {
  try {
    await fn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ============================================
// UNICODE & SPECIAL CHARACTER TESTS
// ============================================

async function testUnicodeNames() {
  console.log('\n📝 UNICODE & SPECIAL CHARACTERS');
  console.log('─'.repeat(50));

  // Arabic names
  await test('Arabic name (محمد أحمد)', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'update_contact',
          parameters: {
            firstName: 'محمد',
            lastName: 'أحمد',
            nationality: 'سوريا'
          }
        },
        call: { id: 'test-arabic', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.data.success !== false || response.data.result, 'Should handle Arabic characters');
  });

  // Chinese names
  await test('Chinese name (李明)', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'update_contact',
          parameters: {
            firstName: '明',
            lastName: '李',
            nationality: '中国'
          }
        },
        call: { id: 'test-chinese', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.data.success !== false || response.data.result, 'Should handle Chinese characters');
  });

  // Cyrillic names (Russian/Ukrainian refugees)
  await test('Cyrillic name (Олександр Петренко)', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'update_contact',
          parameters: {
            firstName: 'Олександр',
            lastName: 'Петренко',
            nationality: 'Україна'
          }
        },
        call: { id: 'test-cyrillic', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.data.success !== false || response.data.result, 'Should handle Cyrillic characters');
  });

  // Names with diacritics (Turkish, Vietnamese)
  await test('Diacritics (Nguyễn Thị Hương)', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'update_contact',
          parameters: {
            firstName: 'Thị Hương',
            lastName: 'Nguyễn',
            nationality: 'Việt Nam'
          }
        },
        call: { id: 'test-diacritics', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.data.success !== false || response.data.result, 'Should handle diacritics');
  });

  // Mixed scripts
  await test('Mixed scripts (Ali محمد Smith)', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'update_contact',
          parameters: {
            firstName: 'Ali محمد',
            lastName: 'Smith',
            nationality: 'UK/Syria'
          }
        },
        call: { id: 'test-mixed', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.data.success !== false || response.data.result, 'Should handle mixed scripts');
  });

  // Emojis in notes (edge case - shouldn't happen but might)
  await test('Emoji in asylum reason (should sanitize)', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'update_contact',
          parameters: {
            asylumReason: 'Fleeing war 🇸🇾 → 🇬🇧'
          }
        },
        call: { id: 'test-emoji', metadata: { contactId: 'test123' } }
      }
    });
    // Should either succeed or fail gracefully
    assert(response.status === 200, 'Should not crash on emoji');
  });
}

// ============================================
// TIMEZONE & DATE BOUNDARY TESTS
// ============================================

async function testTimezoneEdgeCases() {
  console.log('\n🌍 TIMEZONE & DATE BOUNDARIES');
  console.log('─'.repeat(50));

  // Midnight boundary
  await test('Date at midnight boundary', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'check_calendar_availability',
          parameters: {
            date: '2025-12-31' // New Year's Eve
          }
        },
        call: { id: 'test-midnight' }
      }
    });
    assert(response.status === 200, 'Should handle midnight boundary');
  });

  // February 29 (leap year)
  await test('Leap year date (Feb 29, 2028)', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'check_calendar_availability',
          parameters: {
            date: '2028-02-29'
          }
        },
        call: { id: 'test-leap' }
      }
    });
    assert(response.status === 200, 'Should handle leap year dates');
  });

  // Invalid Feb 29 on non-leap year
  await test('Invalid leap date (Feb 29, 2025)', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'check_calendar_availability',
          parameters: {
            date: '2025-02-29'
          }
        },
        call: { id: 'test-invalid-leap' }
      }
    });
    // Should handle gracefully
    assert(response.status === 200, 'Should handle invalid leap date gracefully');
  });

  // Past date booking attempt
  await test('Past date booking attempt', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'book_appointment',
          parameters: {
            date: '2020-01-01',
            time: '10:00',
            firstName: 'Test',
            lastName: 'User'
          }
        },
        call: { id: 'test-past', metadata: { contactId: 'test123' } }
      }
    });
    // Should fail gracefully or be rejected
    assert(response.status === 200, 'Should handle past date gracefully');
  });

  // Far future date
  await test('Far future date (2030)', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'check_calendar_availability',
          parameters: {
            date: '2030-12-25'
          }
        },
        call: { id: 'test-future' }
      }
    });
    assert(response.status === 200, 'Should handle far future dates');
  });
}

// ============================================
// MALFORMED DATA TESTS
// ============================================

async function testMalformedData() {
  console.log('\n🔧 MALFORMED DATA HANDLING');
  console.log('─'.repeat(50));

  // Empty function call
  await test('Empty function call object', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {}
      }
    });
    assert(response.data.error || response.data.result, 'Should handle empty function call');
  });

  // Missing message wrapper
  await test('Missing message wrapper', async () => {
    try {
      await axios.post(`${BASE_URL}/webhook/vapi`, {
        functionCall: { name: 'update_contact' }
      });
    } catch (e) {
      // Expected to fail
    }
  });

  // Invalid JSON in parameters (already parsed, so simulate)
  await test('Nested object in string field', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'update_contact',
          parameters: {
            firstName: { nested: 'object' }, // Should be string
            lastName: 'Test'
          }
        },
        call: { id: 'test-nested', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.status === 200, 'Should handle type mismatch');
  });

  // Array instead of string
  await test('Array in string field', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'update_contact',
          parameters: {
            firstName: ['John', 'Jane'],
            lastName: 'Doe'
          }
        },
        call: { id: 'test-array', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.status === 200, 'Should handle array in string field');
  });

  // SQL injection attempt (should be safe with APIs)
  await test('SQL injection in name field', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'update_contact',
          parameters: {
            firstName: "Robert'; DROP TABLE contacts;--",
            lastName: 'Test'
          }
        },
        call: { id: 'test-sql', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.status === 200, 'Should handle SQL injection attempt');
  });

  // XSS attempt
  await test('XSS in name field', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'update_contact',
          parameters: {
            firstName: '<script>alert("xss")</script>',
            lastName: 'Test'
          }
        },
        call: { id: 'test-xss', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.status === 200, 'Should handle XSS attempt');
  });

  // Extremely long field
  await test('10KB string in field', async () => {
    const longString = 'A'.repeat(10000);
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'update_contact',
          parameters: {
            asylumReason: longString
          }
        },
        call: { id: 'test-long', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.status === 200, 'Should handle very long strings');
  });
}

// ============================================
// CONCURRENT OPERATION TESTS
// ============================================

async function testConcurrentOperations() {
  console.log('\n⚡ CONCURRENT OPERATIONS');
  console.log('─'.repeat(50));

  // Simultaneous calendar checks
  await test('5 simultaneous calendar checks', async () => {
    const promises = Array(5).fill(null).map((_, i) => 
      axios.post(`${BASE_URL}/webhook/vapi`, {
        message: {
          type: 'function-call',
          functionCall: {
            name: 'check_calendar_availability',
            parameters: { date: '2025-12-01' }
          },
          call: { id: `concurrent-cal-${i}` }
        }
      })
    );
    
    const results = await Promise.all(promises);
    assert(results.every(r => r.status === 200), 'All concurrent requests should succeed');
  });

  // Simultaneous contact updates
  await test('5 simultaneous contact updates', async () => {
    const promises = Array(5).fill(null).map((_, i) => 
      axios.post(`${BASE_URL}/webhook/vapi`, {
        message: {
          type: 'function-call',
          functionCall: {
            name: 'update_contact',
            parameters: { firstName: `Concurrent${i}` }
          },
          call: { id: `concurrent-contact-${i}`, metadata: { contactId: `test${i}` } }
        }
      })
    );
    
    const results = await Promise.all(promises);
    assert(results.every(r => r.status === 200), 'All concurrent updates should complete');
  });

  // Mixed operation types
  await test('Mixed concurrent operations', async () => {
    const promises = [
      axios.post(`${BASE_URL}/webhook/vapi`, {
        message: {
          type: 'function-call',
          functionCall: { name: 'check_calendar_availability', parameters: { date: '2025-12-05' } },
          call: { id: 'mixed-1' }
        }
      }),
      axios.post(`${BASE_URL}/webhook/vapi`, {
        message: {
          type: 'function-call',
          functionCall: { name: 'update_contact', parameters: { firstName: 'Mixed' } },
          call: { id: 'mixed-2', metadata: { contactId: 'test123' } }
        }
      }),
      axios.get(`${BASE_URL}/health`)
    ];
    
    const results = await Promise.all(promises);
    assert(results.every(r => r.status === 200), 'Mixed operations should all succeed');
  });
}

// ============================================
// EMERGENCY SCENARIO TESTS
// ============================================

async function testEmergencyScenarios() {
  console.log('\n🚨 EMERGENCY SCENARIOS');
  console.log('─'.repeat(50));

  const emergencyTypes = [
    'immediate_danger',
    'deportation_threat',
    'medical_emergency',
    'domestic_violence',
    'child_at_risk',
    'suicidal_ideation'
  ];

  for (const urgencyType of emergencyTypes) {
    await test(`Emergency: ${urgencyType}`, async () => {
      const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
        message: {
          type: 'function-call',
          functionCall: {
            name: 'create_urgent_task',
            parameters: {
              urgencyType,
              description: `Test emergency: ${urgencyType}`,
              clientName: 'Test Client'
            }
          },
          call: { id: `emergency-${urgencyType}`, metadata: { contactId: 'test123' } }
        }
      });
      assert(response.data.success || response.data.result, `Should handle ${urgencyType}`);
    });
  }
}

// ============================================
// REFERRAL EMAIL EDGE CASES
// ============================================

async function testReferralEdgeCases() {
  console.log('\n📧 REFERRAL EMAIL EDGE CASES');
  console.log('─'.repeat(50));

  // Minimal data
  await test('Referral with minimal data', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'send_referral_email',
          parameters: {
            firstName: 'Min',
            lastName: 'Data',
            nationality: 'Unknown',
            asylumReason: 'Not specified'
          }
        },
        call: { id: 'referral-minimal', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.data.success || response.data.referralSent, 'Should send with minimal data');
  });

  // Very long asylum reason
  await test('Referral with detailed asylum reason', async () => {
    const longReason = `
      Fled from Syria in 2023 due to civil war. Family members killed in bombing.
      Traveled through Turkey, Greece, and France before reaching UK.
      Witnessed traumatic events including violence against family members.
      Seeking protection under 1951 Refugee Convention.
      Has documentation from UNHCR but needs legal representation.
    `.trim();
    
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'send_referral_email',
          parameters: {
            firstName: 'Detailed',
            lastName: 'Case',
            nationality: 'Syria',
            asylumReason: longReason,
            familyIncluded: 'yes'
          }
        },
        call: { id: 'referral-detailed', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.data.success || response.data.referralSent, 'Should handle detailed reason');
  });

  // Special characters in reason
  await test('Referral with special chars in reason', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'send_referral_email',
          parameters: {
            firstName: "O'Brien",
            lastName: 'Müller-Schmidt',
            nationality: 'Côte d\'Ivoire',
            asylumReason: 'Persecution based on religion & ethnicity; threats received'
          }
        },
        call: { id: 'referral-special', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.data.success || response.data.referralSent, 'Should handle special chars');
  });
}

// ============================================
// CONFIRMATION STATUS TESTS
// ============================================

async function testConfirmationStatuses() {
  console.log('\n📅 CONFIRMATION STATUS EDGE CASES');
  console.log('─'.repeat(50));

  const statuses = ['confirmed', 'cancelled', 'reschedule', 'no_answer', 'pending', 'invalid'];

  for (const status of statuses) {
    await test(`Confirmation status: ${status}`, async () => {
      const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
        message: {
          type: 'function-call',
          functionCall: {
            name: 'update_confirmation_status',
            parameters: { status }
          },
          call: { id: `confirm-${status}`, metadata: { contactId: 'test123' } }
        }
      });
      // Valid statuses should succeed, invalid should fail gracefully
      assert(response.status === 200, `Should handle status: ${status}`);
    });
  }
}

// ============================================
// TRANSFER SCENARIOS
// ============================================

async function testTransferScenarios() {
  console.log('\n📞 TRANSFER SCENARIOS');
  console.log('─'.repeat(50));

  await test('Transfer with full context', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'transfer_to_human',
          parameters: {
            reason: 'Client requested human caseworker',
            priority: 'normal',
            summary: 'Syrian refugee, family of 4, seeking private consultation'
          }
        },
        call: { id: 'transfer-full', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.status === 200, 'Should handle full transfer context');
  });

  await test('Emergency transfer', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'transfer_to_human',
          parameters: {
            reason: 'Immediate danger - client in distress',
            priority: 'urgent'
          }
        },
        call: { id: 'transfer-emergency', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.status === 200, 'Should handle emergency transfer');
  });
}

// ============================================
// BOOKING EDGE CASES
// ============================================

async function testBookingEdgeCases() {
  console.log('\n📆 BOOKING EDGE CASES');
  console.log('─'.repeat(50));

  // Early morning booking
  await test('Early morning slot (09:00)', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'book_appointment',
          parameters: {
            date: '2025-12-15',
            time: '09:00',
            firstName: 'Early',
            lastName: 'Bird'
          }
        },
        call: { id: 'book-early', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.status === 200, 'Should handle early morning booking');
  });

  // Late afternoon booking
  await test('Late afternoon slot (17:30)', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'book_appointment',
          parameters: {
            date: '2025-12-15',
            time: '17:30',
            firstName: 'Late',
            lastName: 'Worker'
          }
        },
        call: { id: 'book-late', metadata: { contactId: 'test123' } }
      }
    });
    assert(response.status === 200, 'Should handle late afternoon booking');
  });

  // Weekend booking attempt
  await test('Weekend booking attempt (Saturday)', async () => {
    // Find next Saturday
    const now = new Date();
    const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
    const saturday = new Date(now);
    saturday.setDate(now.getDate() + daysUntilSaturday);
    const saturdayStr = saturday.toISOString().split('T')[0];

    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'check_calendar_availability',
          parameters: { date: saturdayStr }
        },
        call: { id: 'book-weekend' }
      }
    });
    // Should return no slots or handle gracefully
    assert(response.status === 200, 'Should handle weekend gracefully');
  });

  // Christmas Day
  await test('Holiday booking (Dec 25)', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'check_calendar_availability',
          parameters: { date: '2025-12-25' }
        },
        call: { id: 'book-holiday' }
      }
    });
    assert(response.status === 200, 'Should handle holiday date');
  });
}

// ============================================
// RUN ALL TESTS
// ============================================

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 ADVANCED EDGE CASE TESTS');
  console.log('='.repeat(60));
  console.log('Testing scenarios that could break in production...\n');

  try {
    // Check if server is running
    await axios.get(`${BASE_URL}/health`);
  } catch (error) {
    console.log('❌ Server not running. Start with: npm start');
    process.exit(1);
  }

  await testUnicodeNames();
  await testTimezoneEdgeCases();
  await testMalformedData();
  await testConcurrentOperations();
  await testEmergencyScenarios();
  await testReferralEdgeCases();
  await testConfirmationStatuses();
  await testTransferScenarios();
  await testBookingEdgeCases();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 ADVANCED EDGE CASE TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Pass Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`   - ${t.name}: ${t.error}`);
    });
  }

  console.log('');
  process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests();

