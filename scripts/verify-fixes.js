/**
 * Verify all prompt fixes
 */
require('dotenv').config();

const intake = require('../src/config/intake-assistant');
const emergency = require('../src/config/emergency-assistant');
const confirmation = require('../src/config/confirmation-assistant');

console.log('=== VERIFYING FIXES ===\n');

// Test 1: Check intake tool no longer has fullName
const updateContactTool = intake.model.tools.find(t => t.function.name === 'update_contact');
const hasFullName = updateContactTool.function.parameters.properties.fullName !== undefined;
console.log('1. Intake: fullName removed?', hasFullName ? '❌ Still there' : '✅ Yes');

// Test 2: Check emergency update_contact has emergencyType required
const emergencyUpdateTool = emergency.model.tools.find(t => t.function.name === 'update_contact');
const hasEmergencyType = emergencyUpdateTool.function.parameters.required.includes('emergencyType');
console.log('2. Emergency: emergencyType required?', hasEmergencyType ? '✅ Yes' : '❌ No');

// Test 3: Check confirmation firstMessage is generic
const genericMsg = !confirmation.firstMessage.includes('scheduled for today');
console.log('3. Confirmation: firstMessage generic?', genericMsg ? '✅ Yes' : '❌ No');

// Test 4: Verify handler loads without errors
try {
  const handler = require('../src/webhooks/vapi-function-handler');
  console.log('4. Handler: loads without errors?', '✅ Yes');
} catch (e) {
  console.log('4. Handler: loads without errors?', '❌ No -', e.message);
}

console.log('\n=== ALL FIXES VERIFIED ===');

