/**
 * COMPLETE FLOW TESTS
 * 
 * Tests realistic conversation flows end-to-end.
 * Simulates what happens during actual calls.
 * 
 * Usage: node scripts/test-complete-flows.js
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let testResults = [];

// Helper to make VAPI-like requests
async function vapiCall(functionName, parameters, metadata = {}) {
  const response = await axios.post(`${BASE_URL}/webhook/vapi`, {
    message: {
      type: 'function-call',
      functionCall: { name: functionName, parameters }
    },
    call: { 
      id: 'test-flow-' + Date.now(),
      metadata 
    }
  });
  return response.data;
}

function log(message, type = 'info') {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', step: '📍' };
  console.log(`${icons[type] || ''} ${message}`);
}

// ============================================
// FLOW 1: PRIVATE CONSULTATION BOOKING
// ============================================
async function testPrivateConsultationFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('FLOW 1: PRIVATE CONSULTATION BOOKING');
  console.log('='.repeat(60));
  
  const contactId = 'eOsd7vnD17y6UDmppx3Q';
  const metadata = { contact_id: contactId };
  
  try {
    // Step 1: Gather intake information
    log('Step 1: Gathering intake information...', 'step');
    const intake = await vapiCall('update_contact', {
      firstName: 'Fatima',
      lastName: 'Al-Hussein',
      nationality: 'Syria',
      currentCountry: 'United Kingdom',
      ukEntryDate: '2024-08-15',
      immigrationStatus: 'Asylum seeker - pending decision',
      asylumReason: 'Political persecution - journalist critical of government',
      familyIncluded: 'yes',
      familyDetails: 'Husband (35), Son (8), Daughter (5)'
    }, metadata);
    
    if (intake.success) {
      log('Intake saved: ' + intake.message, 'success');
    } else {
      log('Intake failed: ' + intake.error, 'error');
      testResults.push({ flow: 'Private', step: 'Intake', success: false });
      return;
    }
    
    // Step 2: Set triage status to Private
    log('Step 2: Setting triage to PRIVATE...', 'step');
    const triage = await vapiCall('update_contact', {
      triageStatus: 'private'
    }, metadata);
    log('Triage set: ' + (triage.success ? 'private' : 'failed'), triage.success ? 'success' : 'error');
    
    // Step 3: Check calendar availability
    log('Step 3: Checking calendar for next Monday...', 'step');
    const nextMonday = getNextWeekday(1); // 1 = Monday
    const calendar = await vapiCall('check_calendar_availability', {
      date: nextMonday
    }, metadata);
    
    if (calendar.slotsCount > 0) {
      log(`Found ${calendar.slotsCount} slots: ${calendar.availableSlots.slice(0, 5).join(', ')}...`, 'success');
    } else {
      log('No slots available - trying next day', 'info');
    }
    
    // Step 4: Book appointment
    log('Step 4: Booking appointment at 10:00...', 'step');
    const booking = await vapiCall('book_appointment', {
      date: nextMonday,
      time: '10:00',
      notes: 'Private consultation - family of 4, Syria, political persecution'
    }, metadata);
    
    if (booking.success) {
      log(`Booked! Appointment ID: ${booking.appointmentId}`, 'success');
      testResults.push({ flow: 'Private', step: 'Complete', success: true, appointmentId: booking.appointmentId });
    } else {
      log('Booking failed: ' + booking.error, 'error');
      testResults.push({ flow: 'Private', step: 'Booking', success: false });
    }
    
  } catch (error) {
    log('Flow error: ' + error.message, 'error');
    testResults.push({ flow: 'Private', step: 'Error', success: false, error: error.message });
  }
}

// ============================================
// FLOW 2: LEGAL AID REFERRAL
// ============================================
async function testLegalAidFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('FLOW 2: LEGAL AID REFERRAL');
  console.log('='.repeat(60));
  
  const contactId = 'eOsd7vnD17y6UDmppx3Q';
  const metadata = { contact_id: contactId };
  
  try {
    // Step 1: Gather intake
    log('Step 1: Gathering intake information...', 'step');
    const intake = await vapiCall('update_contact', {
      firstName: 'Maria',
      lastName: 'Rodriguez',
      nationality: 'Venezuela',
      currentCountry: 'United Kingdom',
      immigrationStatus: 'Asylum seeker - just arrived',
      asylumReason: 'Persecution - LGBTQ+ identity',
      familyIncluded: 'no'
    }, metadata);
    log('Intake saved: ' + (intake.success ? 'yes' : 'no'), intake.success ? 'success' : 'error');
    
    // Step 2: Set triage to Legal Aid
    log('Step 2: Setting triage to LEGAL AID...', 'step');
    const triage = await vapiCall('update_contact', {
      triageStatus: 'legalaid'
    }, metadata);
    log('Triage set: ' + (triage.success ? 'legalaid' : 'failed'), triage.success ? 'success' : 'error');
    
    // Step 3: Send referral email
    log('Step 3: Sending Legal Aid referral...', 'step');
    const referral = await vapiCall('send_referral_email', {
      firstName: 'Maria',
      lastName: 'Rodriguez',
      nationality: 'Venezuela',
      asylumReason: 'Persecution - LGBTQ+ identity',
      familyIncluded: 'no'
    }, metadata);
    
    if (referral.success || referral.referralSent) {
      log('Referral sent to Legal Aid partner', 'success');
      testResults.push({ flow: 'LegalAid', step: 'Complete', success: true });
    } else {
      log('Referral failed: ' + referral.error, 'error');
      testResults.push({ flow: 'LegalAid', step: 'Referral', success: false });
    }
    
  } catch (error) {
    log('Flow error: ' + error.message, 'error');
    testResults.push({ flow: 'LegalAid', step: 'Error', success: false });
  }
}

// ============================================
// FLOW 3: EMERGENCY HANDLING
// ============================================
async function testEmergencyFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('FLOW 3: EMERGENCY HANDLING');
  console.log('='.repeat(60));
  
  const contactId = 'eOsd7vnD17y6UDmppx3Q';
  const metadata = { contact_id: contactId };
  
  try {
    // Step 1: Update contact with emergency flag
    log('Step 1: Saving contact as emergency...', 'step');
    const update = await vapiCall('update_contact', {
      firstName: 'Abdul',
      lastName: 'Rahman',
      emergencyFlag: 'true',
      emergencyType: 'deportation_threat'
    }, metadata);
    log('Emergency flag set: ' + (update.success ? 'yes' : 'no'), update.success ? 'success' : 'error');
    
    // Step 2: Create urgent task
    log('Step 2: Creating urgent task for team...', 'step');
    const task = await vapiCall('create_urgent_task', {
      urgencyType: 'deportation_threat',
      description: 'Client reports immigration enforcement at door. Needs immediate legal intervention.',
      clientName: 'Abdul Rahman'
    }, metadata);
    
    if (task.success || task.taskId) {
      log('Urgent task created', 'success');
    } else {
      log('Task creation: ' + (task.fallback ? 'logged locally' : 'failed'), task.fallback ? 'info' : 'error');
    }
    
    // Step 3: Transfer to human
    log('Step 3: Initiating transfer to human...', 'step');
    const transfer = await vapiCall('transfer_to_human', {
      reason: 'Emergency - deportation threat, client in immediate danger',
      priority: 'urgent'
    }, metadata);
    
    log('Transfer result: ' + JSON.stringify(transfer), transfer.transferInitiated ? 'success' : 'info');
    testResults.push({ flow: 'Emergency', step: 'Complete', success: true });
    
  } catch (error) {
    log('Flow error: ' + error.message, 'error');
    testResults.push({ flow: 'Emergency', step: 'Error', success: false });
  }
}

// ============================================
// FLOW 4: CONFIRMATION & RESCHEDULE
// ============================================
async function testConfirmationFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('FLOW 4: CONFIRMATION & RESCHEDULE');
  console.log('='.repeat(60));
  
  const contactId = 'eOsd7vnD17y6UDmppx3Q';
  const metadata = { contact_id: contactId };
  
  try {
    // Step 1: Confirm appointment
    log('Step 1: Client confirms appointment...', 'step');
    const confirm = await vapiCall('update_confirmation_status', {
      status: 'confirmed'
    }, metadata);
    log('Confirmation status updated: ' + (confirm.success ? 'confirmed' : 'failed'), confirm.success ? 'success' : 'error');
    
    // Step 2: Client requests reschedule
    log('Step 2: Client requests reschedule...', 'step');
    const reschedule = await vapiCall('update_confirmation_status', {
      status: 'reschedule'
    }, metadata);
    log('Status changed to reschedule: ' + (reschedule.success ? 'yes' : 'no'), reschedule.success ? 'success' : 'error');
    
    // Step 3: Check new availability
    log('Step 3: Checking new availability...', 'step');
    const nextTuesday = getNextWeekday(2);
    const calendar = await vapiCall('check_calendar_availability', {
      date: nextTuesday
    }, metadata);
    log(`Available slots on ${nextTuesday}: ${calendar.slotsCount}`, calendar.slotsCount > 0 ? 'success' : 'info');
    
    // Step 4: Book new appointment
    if (calendar.slotsCount > 0) {
      log('Step 4: Booking new time (14:30)...', 'step');
      const newBooking = await vapiCall('book_appointment', {
        date: nextTuesday,
        time: '14:30'
      }, metadata);
      log('Rescheduled: ' + (newBooking.success ? newBooking.appointmentId : newBooking.error), newBooking.success ? 'success' : 'error');
    }
    
    testResults.push({ flow: 'Confirmation', step: 'Complete', success: true });
    
  } catch (error) {
    log('Flow error: ' + error.message, 'error');
    testResults.push({ flow: 'Confirmation', step: 'Error', success: false });
  }
}

// ============================================
// FLOW 5: CANCEL APPOINTMENT
// ============================================
async function testCancelFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('FLOW 5: CANCEL APPOINTMENT');
  console.log('='.repeat(60));
  
  const contactId = 'eOsd7vnD17y6UDmppx3Q';
  const metadata = { contact_id: contactId };
  
  try {
    // First book an appointment to cancel
    log('Setup: Booking appointment to cancel...', 'step');
    const nextWed = getNextWeekday(3);
    const booking = await vapiCall('book_appointment', {
      date: nextWed,
      time: '16:00'
    }, metadata);
    
    if (!booking.success) {
      log('Could not book appointment to test cancel', 'error');
      testResults.push({ flow: 'Cancel', step: 'Setup', success: false });
      return;
    }
    
    log(`Booked appointment: ${booking.appointmentId}`, 'success');
    
    // Update metadata with appointment ID
    const cancelMetadata = { ...metadata, appointment_id: booking.appointmentId };
    
    // Now cancel it
    log('Step 1: Cancelling appointment...', 'step');
    const cancel = await vapiCall('cancel_appointment', {
      reason: 'Client changed mind - no longer needs consultation'
    }, cancelMetadata);
    
    if (cancel.success) {
      log('Appointment cancelled successfully', 'success');
      testResults.push({ flow: 'Cancel', step: 'Complete', success: true });
    } else {
      log('Cancel failed: ' + cancel.error, 'error');
      testResults.push({ flow: 'Cancel', step: 'Cancel', success: false });
    }
    
  } catch (error) {
    log('Flow error: ' + error.message, 'error');
    testResults.push({ flow: 'Cancel', step: 'Error', success: false });
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function getNextWeekday(targetDay) {
  // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const now = new Date();
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysUntil);
  return targetDate.toISOString().split('T')[0];
}

// ============================================
// RUN ALL FLOWS
// ============================================
async function runAllFlows() {
  console.log('\n' + '🧪'.repeat(30));
  console.log('   COMPLETE FLOW TESTS');
  console.log('🧪'.repeat(30));
  
  // Check server
  try {
    await axios.get(`${BASE_URL}/health`);
  } catch (e) {
    console.log('\n❌ Server not running. Start with: npm start');
    process.exit(1);
  }
  
  await testPrivateConsultationFlow();
  await testLegalAidFlow();
  await testEmergencyFlow();
  await testConfirmationFlow();
  await testCancelFlow();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FLOW TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = testResults.filter(r => r.success).length;
  const failed = testResults.filter(r => !r.success).length;
  
  testResults.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} ${r.flow}: ${r.step}${r.appointmentId ? ' (ID: ' + r.appointmentId + ')' : ''}`);
  });
  
  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('');
  
  process.exit(failed > 0 ? 1 : 0);
}

runAllFlows();

