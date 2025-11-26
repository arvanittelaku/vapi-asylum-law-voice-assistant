/**
 * Comprehensive Local Test Script
 * 
 * Tests all webhook functions with simulated VAPI payloads.
 * Run with: node scripts/test-all-functions.js
 */

require('dotenv').config();
const vapiFunctionHandler = require('../src/webhooks/vapi-function-handler');

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

function log(message, type = 'info') {
  const colors = {
    pass: '\x1b[32m✅',
    fail: '\x1b[31m❌',
    skip: '\x1b[33m⚠️',
    info: '\x1b[36mℹ️',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]} ${message}${colors.reset}`);
}

async function runTest(name, payload, expectedFields) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing: ${name}`);
  console.log('='.repeat(50));
  
  try {
    const result = await vapiFunctionHandler.handleFunctionCall(payload);
    
    // Check expected fields
    let passed = true;
    const checks = [];
    
    for (const [field, expectedValue] of Object.entries(expectedFields)) {
      if (expectedValue === true) {
        // Just check field exists and is truthy
        if (result[field]) {
          checks.push({ field, status: 'pass', value: result[field] });
        } else {
          checks.push({ field, status: 'fail', expected: 'truthy', got: result[field] });
          passed = false;
        }
      } else if (expectedValue === false) {
        // Check field is falsy
        if (!result[field]) {
          checks.push({ field, status: 'pass', value: result[field] });
        } else {
          checks.push({ field, status: 'fail', expected: 'falsy', got: result[field] });
          passed = false;
        }
      } else {
        // Check exact value
        if (result[field] === expectedValue) {
          checks.push({ field, status: 'pass', value: result[field] });
        } else {
          checks.push({ field, status: 'fail', expected: expectedValue, got: result[field] });
          passed = false;
        }
      }
    }
    
    // Log results
    checks.forEach(c => {
      if (c.status === 'pass') {
        log(`${c.field}: ${JSON.stringify(c.value).substring(0, 50)}`, 'pass');
      } else {
        log(`${c.field}: Expected ${c.expected}, got ${JSON.stringify(c.got)}`, 'fail');
      }
    });
    
    if (passed) {
      results.passed++;
      results.tests.push({ name, status: 'passed' });
      log(`TEST PASSED: ${name}`, 'pass');
    } else {
      results.failed++;
      results.tests.push({ name, status: 'failed', result });
      log(`TEST FAILED: ${name}`, 'fail');
    }
    
    return result;
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'error', error: error.message });
    log(`TEST ERROR: ${name} - ${error.message}`, 'fail');
    return null;
  }
}

async function runAllTests() {
  console.log('\n' + '🧪'.repeat(25));
  console.log('   ASYLUMLAW WEBHOOK FUNCTION TESTS');
  console.log('🧪'.repeat(25) + '\n');
  
  // Check if GHL API key is set
  if (!process.env.GHL_API_KEY) {
    log('GHL_API_KEY not set - some tests will fail', 'skip');
  }
  
  // ============================================
  // TEST 1: Update Contact (Create New)
  // ============================================
  await runTest(
    'Update Contact - Create New',
    {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'update_contact',
          parameters: {
            firstName: 'Test',
            lastName: 'User',
            nationality: 'Afghanistan',
            currentCountry: 'United Kingdom',
            asylumReason: 'Fleeing persecution',
            triageStatus: 'private-candidate'
          }
        }
      },
      call: {
        metadata: {
          customerPhone: '+447700900' + Math.floor(Math.random() * 1000)
        }
      }
    },
    {
      success: true,
      contactId: true, // Just check it exists
      message: 'Contact information saved successfully'
    }
  );
  
  // ============================================
  // TEST 2: Check Calendar Availability
  // ============================================
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  await runTest(
    'Check Calendar Availability',
    {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'check_calendar_availability',
          parameters: {
            date: tomorrowStr
          }
        }
      },
      call: {
        metadata: {}
      }
    },
    {
      success: true,
      date: tomorrowStr
      // slotsCount may be 0 or more
    }
  );
  
  // ============================================
  // TEST 3: Send Referral Email
  // ============================================
  await runTest(
    'Send Referral Email',
    {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'send_referral_email',
          parameters: {
            firstName: 'Maria',
            lastName: 'Garcia',
            nationality: 'Venezuela',
            asylumReason: 'Political persecution'
          }
        }
      },
      call: {
        metadata: {}
      }
    },
    {
      success: true,
      referralSent: true
    }
  );
  
  // ============================================
  // TEST 4: Transfer to Human
  // ============================================
  await runTest(
    'Transfer to Human',
    {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'transfer_to_human',
          parameters: {
            reason: 'emergency',
            urgency: 'immediate',
            details: 'Client is in immediate danger'
          }
        }
      },
      call: {
        metadata: {}
      }
    },
    {
      success: true,
      transfer: true
    }
  );
  
  // ============================================
  // TEST 5: Create Urgent Task
  // ============================================
  await runTest(
    'Create Urgent Task',
    {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'create_urgent_task',
          parameters: {
            title: 'Test Emergency',
            details: 'This is a test emergency task',
            emergencyType: 'detention'
          }
        }
      },
      call: {
        metadata: {}
      }
    },
    {
      success: true,
      message: 'Urgent task created and team notified'
    }
  );
  
  // ============================================
  // TEST 6: Update Confirmation Status (without contact_id - should fail gracefully)
  // ============================================
  await runTest(
    'Update Confirmation Status - No Contact ID',
    {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'update_confirmation_status',
          parameters: {
            status: 'confirmed'
          }
        }
      },
      call: {
        metadata: {}
      }
    },
    {
      success: false,
      error: 'Contact ID not found'
    }
  );
  
  // ============================================
  // TEST 7: Book Appointment (without contact_id - should fail gracefully)
  // ============================================
  await runTest(
    'Book Appointment - No Contact ID',
    {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'book_appointment',
          parameters: {
            date: tomorrowStr,
            time: '10:00'
          }
        }
      },
      call: {
        metadata: {}
      }
    },
    {
      success: false,
      error: 'Contact ID not found. Please update contact first.'
    }
  );
  
  // ============================================
  // TEST 8: Cancel Appointment (without appointment_id - should fail gracefully)
  // ============================================
  await runTest(
    'Cancel Appointment - No Appointment ID',
    {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'cancel_appointment',
          parameters: {
            reason: 'Changed plans'
          }
        }
      },
      call: {
        metadata: {}
      }
    },
    {
      success: false,
      error: 'Appointment ID not found'
    }
  );
  
  // ============================================
  // TEST 9: Unknown Function
  // ============================================
  await runTest(
    'Unknown Function - Should Return Error',
    {
      message: {
        type: 'function-call',
        functionCall: {
          name: 'unknown_function',
          parameters: {}
        }
      },
      call: {
        metadata: {}
      }
    },
    {
      error: 'Unknown function: unknown_function'
    }
  );
  
  // ============================================
  // TEST 10: Invalid Payload Type
  // ============================================
  await runTest(
    'Invalid Payload - Not a Function Call',
    {
      message: {
        type: 'assistant-message',
        content: 'Hello'
      },
      call: {
        metadata: {}
      }
    },
    {
      error: 'Not a function call'
    }
  );
  
  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  log(`Passed: ${results.passed}`, results.passed > 0 ? 'pass' : 'info');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'fail' : 'info');
  log(`Skipped: ${results.skipped}`, results.skipped > 0 ? 'skip' : 'info');
  console.log('='.repeat(50));
  
  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Ready for deployment testing.\n');
  } else {
    console.log('\n⚠️ Some tests failed. Review above for details.\n');
  }
  
  return results;
}

// Run tests
runAllTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });

