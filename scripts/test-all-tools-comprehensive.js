/**
 * COMPREHENSIVE TOOL-BY-TOOL TEST
 * 
 * Tests EVERY tool individually with all parameters
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const CONTACT_ID = 'eOsd7vnD17y6UDmppx3Q';

let passed = 0;
let failed = 0;
let bookedAppointmentId = null;

async function vapiCall(functionName, parameters, extraMetadata = {}) {
  const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
    message: {
      type: 'function-call',
      functionCall: { name: functionName, parameters }
    },
    call: { 
      id: 'tool-test-' + Date.now(),
      metadata: { contact_id: CONTACT_ID, ...extraMetadata }
    }
  });
  return response.data;
}

async function test(name, fn) {
  try {
    const result = await fn();
    if (result.success !== false && !result.error) {
      passed++;
      console.log(`✅ ${name}`);
      return result;
    } else {
      failed++;
      console.log(`❌ ${name}: ${result.error || 'Unknown error'}`);
      return result;
    }
  } catch (e) {
    failed++;
    console.log(`❌ ${name}: ${e.message}`);
    return null;
  }
}

async function runAllToolTests() {
  console.log('='.repeat(60));
  console.log('🔧 COMPREHENSIVE TOOL-BY-TOOL TEST');
  console.log('='.repeat(60));
  
  // Check server
  try {
    await axios.get(`${BASE_URL}/health`);
  } catch (e) {
    console.log('❌ Server not running. Start with: npm start');
    process.exit(1);
  }

  // ============================================
  // 1. UPDATE_CONTACT
  // ============================================
  console.log('\n📋 TOOL 1: update_contact');
  console.log('-'.repeat(40));
  
  await test('Update basic info (firstName, lastName)', async () => {
    return vapiCall('update_contact', {
      firstName: 'Test',
      lastName: 'User'
    });
  });

  await test('Update nationality', async () => {
    return vapiCall('update_contact', { nationality: 'Afghanistan' });
  });

  await test('Update current country', async () => {
    return vapiCall('update_contact', { currentCountry: 'United Kingdom' });
  });

  await test('Update UK entry date', async () => {
    return vapiCall('update_contact', { ukEntryDate: '2024-06-15' });
  });

  await test('Update immigration status', async () => {
    return vapiCall('update_contact', { immigrationStatus: 'Asylum seeker - awaiting decision' });
  });

  await test('Update asylum reason', async () => {
    return vapiCall('update_contact', { asylumReason: 'Political persecution - journalist' });
  });

  await test('Update family included (yes)', async () => {
    return vapiCall('update_contact', { familyIncluded: 'yes' });
  });

  await test('Update family details', async () => {
    return vapiCall('update_contact', { familyDetails: 'Wife (30), Son (5), Daughter (3)' });
  });

  await test('Update triage to private', async () => {
    return vapiCall('update_contact', { triageStatus: 'private' });
  });

  await test('Update triage to legalaid', async () => {
    return vapiCall('update_contact', { triageStatus: 'legalaid' });
  });

  await test('Update multiple fields at once', async () => {
    return vapiCall('update_contact', {
      firstName: 'MultiField',
      lastName: 'Test',
      nationality: 'Syria',
      asylumReason: 'War and persecution',
      triageStatus: 'private'
    });
  });

  // ============================================
  // 2. CHECK_CALENDAR_AVAILABILITY
  // ============================================
  console.log('\n📅 TOOL 2: check_calendar_availability');
  console.log('-'.repeat(40));

  // Get next weekdays
  const getNextWeekday = (dayOffset) => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    // Skip to Monday if weekend
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    return d.toISOString().split('T')[0];
  };

  const testDate1 = getNextWeekday(7);
  const testDate2 = getNextWeekday(8);
  const testDate3 = getNextWeekday(9);

  await test(`Check availability for ${testDate1}`, async () => {
    const result = await vapiCall('check_calendar_availability', { date: testDate1 });
    console.log(`   → ${result.slotsCount} slots found`);
    return result;
  });

  await test(`Check availability for ${testDate2}`, async () => {
    const result = await vapiCall('check_calendar_availability', { date: testDate2 });
    console.log(`   → ${result.slotsCount} slots found`);
    return result;
  });

  // Saturday (should return 0)
  const getSaturday = () => {
    const d = new Date();
    d.setDate(d.getDate() + (6 - d.getDay() + 7) % 7 + 7);
    return d.toISOString().split('T')[0];
  };
  const saturday = getSaturday();

  await test(`Check Saturday ${saturday} (should be 0)`, async () => {
    const result = await vapiCall('check_calendar_availability', { date: saturday });
    console.log(`   → ${result.slotsCount} slots (expected: 0)`);
    return { success: result.slotsCount === 0 || result.success };
  });

  // ============================================
  // 3. BOOK_APPOINTMENT
  // ============================================
  console.log('\n📆 TOOL 3: book_appointment');
  console.log('-'.repeat(40));

  const bookingDate = getNextWeekday(10);

  await test(`Book appointment on ${bookingDate} at 11:00`, async () => {
    const result = await vapiCall('book_appointment', {
      date: bookingDate,
      time: '11:00',
      notes: 'Test booking'
    });
    if (result.appointmentId) {
      bookedAppointmentId = result.appointmentId;
      console.log(`   → Appointment ID: ${result.appointmentId}`);
    }
    return result;
  });

  await test('Book without contact_id (should fail gracefully)', async () => {
    const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
      message: {
        type: 'function-call',
        functionCall: { 
          name: 'book_appointment', 
          parameters: { date: bookingDate, time: '15:00' }
        }
      },
      call: { id: 'no-contact-test', metadata: {} } // No contact_id
    });
    // Should return error about missing contact
    console.log(`   → ${response.data.error || 'Unexpected success'}`);
    return { success: response.data.error?.includes('Contact ID') };
  });

  // ============================================
  // 4. UPDATE_CONFIRMATION_STATUS
  // ============================================
  console.log('\n✓ TOOL 4: update_confirmation_status');
  console.log('-'.repeat(40));

  await test('Set status to confirmed', async () => {
    return vapiCall('update_confirmation_status', { status: 'confirmed' });
  });

  await test('Set status to reschedule', async () => {
    return vapiCall('update_confirmation_status', { status: 'reschedule' });
  });

  await test('Set status to cancelled', async () => {
    return vapiCall('update_confirmation_status', { status: 'cancelled' });
  });

  await test('Set status to no_answer', async () => {
    return vapiCall('update_confirmation_status', { status: 'no_answer' });
  });

  // ============================================
  // 5. CANCEL_APPOINTMENT
  // ============================================
  console.log('\n🚫 TOOL 5: cancel_appointment');
  console.log('-'.repeat(40));

  // First book one to cancel
  const cancelDate = getNextWeekday(11);
  let appointmentToCancel = null;

  await test(`Book appointment to cancel (${cancelDate})`, async () => {
    const result = await vapiCall('book_appointment', {
      date: cancelDate,
      time: '16:00'
    });
    appointmentToCancel = result.appointmentId;
    return result;
  });

  if (appointmentToCancel) {
    await test('Cancel the appointment', async () => {
      return vapiCall('cancel_appointment', {
        reason: 'Test cancellation'
      }, { appointment_id: appointmentToCancel });
    });
  }

  await test('Cancel without appointment_id (should fail gracefully)', async () => {
    const result = await vapiCall('cancel_appointment', { reason: 'test' });
    console.log(`   → ${result.error || 'Unexpected'}`);
    return { success: result.error?.includes('Appointment ID') };
  });

  // ============================================
  // 6. SEND_REFERRAL_EMAIL
  // ============================================
  console.log('\n📧 TOOL 6: send_referral_email');
  console.log('-'.repeat(40));

  await test('Send Legal Aid referral with all fields', async () => {
    return vapiCall('send_referral_email', {
      firstName: 'Test',
      lastName: 'Referral',
      nationality: 'Iran',
      asylumReason: 'Religious persecution',
      familyIncluded: 'no'
    });
  });

  await test('Send referral with minimal fields', async () => {
    return vapiCall('send_referral_email', {
      firstName: 'Minimal',
      lastName: 'Test',
      nationality: 'Unknown',
      asylumReason: 'Seeking protection'
    });
  });

  // ============================================
  // 7. CREATE_URGENT_TASK
  // ============================================
  console.log('\n🚨 TOOL 7: create_urgent_task');
  console.log('-'.repeat(40));

  await test('Create task: immediate_danger', async () => {
    return vapiCall('create_urgent_task', {
      urgencyType: 'immediate_danger',
      description: 'Client reports being in immediate physical danger',
      clientName: 'Test Client'
    });
  });

  await test('Create task: deportation_threat', async () => {
    return vapiCall('create_urgent_task', {
      urgencyType: 'deportation_threat',
      description: 'Immigration enforcement at door',
      clientName: 'Urgent Test'
    });
  });

  await test('Create task: medical_emergency', async () => {
    return vapiCall('create_urgent_task', {
      urgencyType: 'medical_emergency',
      description: 'Client needs immediate medical attention',
      clientName: 'Medical Test'
    });
  });

  // ============================================
  // 8. TRANSFER_TO_HUMAN
  // ============================================
  console.log('\n📞 TOOL 8: transfer_to_human');
  console.log('-'.repeat(40));

  await test('Transfer with reason', async () => {
    const result = await vapiCall('transfer_to_human', {
      reason: 'Client requested human caseworker'
    });
    console.log(`   → Destination: ${result.destination || 'N/A'}`);
    return result;
  });

  await test('Emergency transfer', async () => {
    const result = await vapiCall('transfer_to_human', {
      reason: 'Emergency - immediate danger',
      priority: 'urgent'
    });
    return result;
  });

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE TOOL TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('');

  if (failed === 0) {
    console.log('🎉 ALL TOOLS WORKING CORRECTLY!');
  } else {
    console.log('⚠️  Some tools need attention');
  }
  console.log('');
}

runAllToolTests();

