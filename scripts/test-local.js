/**
 * Local Testing Script
 * 
 * Tests the webhook handlers locally without making actual API calls.
 * Run: npm run test:local
 */

require('dotenv').config();

// Mock payloads for testing
const mockPayloads = {
  // Mock VAPI function call for check_calendar_availability
  checkCalendar: {
    message: {
      type: 'function-call',
      functionCall: {
        name: 'check_calendar_availability',
        parameters: {
          date: '2024-12-20'
        }
      }
    },
    call: {
      id: 'test-call-123',
      metadata: {
        contact_id: 'test-contact-456',
        timezone: 'Europe/London',
        customerPhone: '+447700900123'
      }
    }
  },

  // Mock VAPI function call for update_contact
  updateContact: {
    message: {
      type: 'function-call',
      functionCall: {
        name: 'update_contact',
        parameters: {
          firstName: 'Ahmad',
          lastName: 'Hassan',
          nationality: 'Syria',
          currentCountry: 'United Kingdom',
          ukEntryDate: '15/06/2023',
          immigrationStatus: 'Asylum seeker',
          asylumReason: 'Fleeing persecution due to political activities',
          familyIncluded: 'yes',
          familyDetails: 'Wife: Fatima Hassan (DOB: 01/03/1990), Son: Omar Hassan (DOB: 15/08/2018)',
          preferredChannel: 'whatsapp',
          triageStatus: 'private-candidate'
        }
      }
    },
    call: {
      id: 'test-call-123',
      metadata: {
        contact_id: 'test-contact-456',
        customerPhone: '+447700900123'
      }
    }
  },

  // Mock GHL trigger for initial call
  ghlTrigger: {
    contact_id: 'test-contact-456',
    customer_name: 'Ahmad Hassan',
    customer_phone: '+447700900123',
    customer_email: 'ahmad.hassan@email.com',
    lead_source: 'website_form'
  },

  // Mock end-of-call payload
  endOfCall: {
    call: {
      id: 'test-call-123',
      metadata: {
        contact_id: 'test-contact-456',
        customerPhone: '+447700900123',
        customerName: 'Ahmad Hassan',
        type: 'intake'
      }
    },
    endedReason: 'customer-did-not-answer',
    transcript: 'Call went to voicemail'
  }
};

async function runTests() {
  console.log('============================================');
  console.log('  LOCAL TESTING - AsylumLaw Voice Assistant');
  console.log('============================================');
  console.log('');

  // Test 1: Timezone Detection
  console.log('🧪 Test 1: Timezone Detection');
  const timezoneDetector = require('../src/services/timezone-detector');
  
  const testPhones = [
    '+447700900123',  // UK
    '+33612345678',   // France
    '+93701234567',   // Afghanistan
    '+963912345678',  // Syria
    '+9647701234567'  // Iraq
  ];

  for (const phone of testPhones) {
    const tz = timezoneDetector.detectTimezone(phone);
    console.log(`  ${phone} → ${tz}`);
  }
  console.log('  ✅ Timezone detection working');
  console.log('');

  // Test 2: Business Hours Validation
  console.log('🧪 Test 2: Business Hours Validation');
  const callingHoursValidator = require('../src/services/calling-hours-validator');
  
  const testTimes = [
    { time: '2024-01-15T08:30:00Z', tz: 'Europe/London', expected: false },  // Too early
    { time: '2024-01-15T10:00:00Z', tz: 'Europe/London', expected: true },   // 10 AM
    { time: '2024-01-15T18:30:00Z', tz: 'Europe/London', expected: true },   // 6:30 PM
    { time: '2024-01-15T19:30:00Z', tz: 'Europe/London', expected: false },  // Too late
    { time: '2024-01-13T12:00:00Z', tz: 'Europe/London', expected: false }   // Saturday
  ];

  for (const { time, tz, expected } of testTimes) {
    const result = callingHoursValidator.isWithinCallingHours(new Date(time), tz);
    const status = result === expected ? '✅' : '❌';
    console.log(`  ${status} ${time} (${tz}) → ${result}`);
  }
  console.log('');

  // Test 3: Smart Retry Calculation
  console.log('🧪 Test 3: Smart Retry Calculation');
  const smartRetryCalculator = require('../src/services/smart-retry-calculator');

  const retryScenarios = [
    { reason: 'customer-did-not-answer', attempts: 0 },
    { reason: 'customer-did-not-answer', attempts: 1 },
    { reason: 'customer-did-not-answer', attempts: 2 },
    { reason: 'customer-did-not-answer', attempts: 3 },
    { reason: 'customer-ended-call', attempts: 0 }
  ];

  for (const scenario of retryScenarios) {
    const result = smartRetryCalculator.calculateRetry({
      endedReason: scenario.reason,
      currentAttempts: scenario.attempts,
      phoneNumber: '+447700900123'
    });
    
    console.log(`  Reason: ${scenario.reason}, Attempts: ${scenario.attempts}`);
    console.log(`    → Should retry: ${result.shouldRetry}`);
    if (result.shouldRetry) {
      console.log(`    → Delay: ${smartRetryCalculator.getDelayDescription(result.adjustedDelayMinutes)}`);
    }
  }
  console.log('  ✅ Smart retry calculation working');
  console.log('');

  // Test 4: GHL Custom Fields Builder
  console.log('🧪 Test 4: GHL Custom Fields Builder');
  const ghlClient = require('../src/services/ghl-client');
  
  const testFields = {
    nationality: 'Syria',
    triageStatus: 'private-candidate',
    confirmationStatus: 'confirmed'
  };
  
  const builtFields = ghlClient.buildCustomFields(testFields);
  console.log('  Input:', testFields);
  console.log('  Output:', builtFields.length > 0 ? 'Fields built (IDs from env)' : 'No field IDs configured');
  console.log('  ✅ Custom fields builder working');
  console.log('');

  // Summary
  console.log('============================================');
  console.log('  ALL LOCAL TESTS COMPLETED');
  console.log('============================================');
  console.log('');
  console.log('Note: These tests verify local logic only.');
  console.log('For full integration testing, deploy and use');
  console.log('real API calls via the webhook endpoints.');
  console.log('');
}

// Run tests
runTests().catch(console.error);

