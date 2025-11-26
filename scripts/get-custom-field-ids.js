/**
 * Get Custom Field IDs from GoHighLevel
 * 
 * This script fetches all custom fields from your GHL location
 * and displays them so you can copy the IDs to your .env file.
 * 
 * Usage: node scripts/get-custom-field-ids.js
 */

require('dotenv').config();
const axios = require('axios');

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

async function getCustomFields() {
  if (!GHL_API_KEY) {
    console.error('❌ Error: GHL_API_KEY is not set in your .env file');
    console.log('\nPlease add your GHL API key to .env:');
    console.log('GHL_API_KEY=your_api_key_here');
    process.exit(1);
  }

  if (!GHL_LOCATION_ID) {
    console.error('❌ Error: GHL_LOCATION_ID is not set in your .env file');
    console.log('\nPlease add your GHL Location ID to .env:');
    console.log('GHL_LOCATION_ID=your_location_id_here');
    process.exit(1);
  }

  console.log('🔍 Fetching custom fields from GoHighLevel...\n');

  try {
    const response = await axios.get(
      `https://services.leadconnectorhq.com/locations/${GHL_LOCATION_ID}/customFields`,
      {
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      }
    );

    const customFields = response.data.customFields || [];
    
    if (customFields.length === 0) {
      console.log('No custom fields found.');
      return;
    }

    console.log('=' .repeat(80));
    console.log('📋 YOUR CUSTOM FIELDS');
    console.log('=' .repeat(80));
    console.log('');

    // Group by model (Contact, Company, Opportunity)
    const contactFields = customFields.filter(f => f.model === 'contact');
    
    console.log('🧑 CONTACT FIELDS:');
    console.log('-'.repeat(80));
    console.log('');

    // Fields we're looking for
    const targetFields = [
      'asylum_immigration_status',
      'call_attempts', 
      'confirmation_status',
      'emergency_flag',
      'emergency_type',
      'interpreter_needed',
      'interpreter_language',
      'last_call_time',
      'next_call_scheduled',
      'call_end_reason',
      'asylum_nationality',
      'current_residence',
      'uk_entry_date',
      'asylum_brief_reason',
      'asylum_family_included',
      'asylum_family_details',
      'asylum_triage',
      'asylum_preferred_channel_of_communication',
      'asylum_full_name'
    ];

    // Find and display matching fields
    const matchedFields = [];
    const unmatchedFields = [];

    contactFields.forEach(field => {
      const key = field.fieldKey || field.key || '';
      const isTarget = targetFields.some(t => 
        key.toLowerCase().includes(t.toLowerCase().replace(/_/g, '')) ||
        key.toLowerCase().replace(/[_\s]/g, '') === t.toLowerCase().replace(/[_\s]/g, '') ||
        field.name.toLowerCase().includes(t.replace(/_/g, ' '))
      );

      if (isTarget) {
        matchedFields.push(field);
      } else {
        unmatchedFields.push(field);
      }
    });

    // Display matched fields first (ones we need)
    if (matchedFields.length > 0) {
      console.log('✅ FIELDS FOR YOUR PROJECT (copy these to .env):');
      console.log('');
      
      matchedFields.forEach(field => {
        console.log(`Name: ${field.name}`);
        console.log(`ID:   ${field.id}`);
        console.log(`Key:  ${field.fieldKey || field.key || 'N/A'}`);
        console.log('');
      });
    }

    // Generate .env suggestions
    console.log('');
    console.log('=' .repeat(80));
    console.log('📝 SUGGESTED .env ENTRIES:');
    console.log('=' .repeat(80));
    console.log('');
    console.log('# Copy and paste these into your .env file:');
    console.log('');

    // Map field names to env variable names
    const envMapping = {
      'immigration': 'GHL_FIELD_IMMIGRATION_STATUS',
      'call_attempts': 'GHL_FIELD_CALL_ATTEMPTS',
      'callattempts': 'GHL_FIELD_CALL_ATTEMPTS',
      'confirmation': 'GHL_FIELD_CONFIRMATION_STATUS',
      'emergency_flag': 'GHL_FIELD_EMERGENCY_FLAG',
      'emergencyflag': 'GHL_FIELD_EMERGENCY_FLAG',
      'emergency_type': 'GHL_FIELD_EMERGENCY_TYPE',
      'emergencytype': 'GHL_FIELD_EMERGENCY_TYPE',
      'interpreter_needed': 'GHL_FIELD_INTERPRETER_NEEDED',
      'interpreterneeded': 'GHL_FIELD_INTERPRETER_NEEDED',
      'interpreter_language': 'GHL_FIELD_INTERPRETER_LANGUAGE',
      'interpreterlanguage': 'GHL_FIELD_INTERPRETER_LANGUAGE',
      'last_call': 'GHL_FIELD_LAST_CALL_TIME',
      'lastcall': 'GHL_FIELD_LAST_CALL_TIME',
      'next_call': 'GHL_FIELD_NEXT_CALL_SCHEDULED',
      'nextcall': 'GHL_FIELD_NEXT_CALL_SCHEDULED',
      'call_end': 'GHL_FIELD_ENDED_REASON',
      'callend': 'GHL_FIELD_ENDED_REASON',
      'end_reason': 'GHL_FIELD_ENDED_REASON',
      'asylum_nationality': 'GHL_FIELD_NATIONALITY',
      'asylumnationality': 'GHL_FIELD_NATIONALITY',
      'current_residence': 'GHL_FIELD_CURRENT_COUNTRY',
      'currentresidence': 'GHL_FIELD_CURRENT_COUNTRY',
      'uk_entry': 'GHL_FIELD_UK_ENTRY_DATE',
      'ukentry': 'GHL_FIELD_UK_ENTRY_DATE',
      'asylum_brief': 'GHL_FIELD_ASYLUM_REASON',
      'asylumbrief': 'GHL_FIELD_ASYLUM_REASON',
      'family_included': 'GHL_FIELD_FAMILY_INCLUDED',
      'familyincluded': 'GHL_FIELD_FAMILY_INCLUDED',
      'family_details': 'GHL_FIELD_FAMILY_DETAILS',
      'familydetails': 'GHL_FIELD_FAMILY_DETAILS',
      'asylum_triage': 'GHL_FIELD_TRIAGE_STATUS',
      'asylumtriage': 'GHL_FIELD_TRIAGE_STATUS',
      'preferred_channel': 'GHL_FIELD_PREFERRED_CHANNEL',
      'preferredchannel': 'GHL_FIELD_PREFERRED_CHANNEL',
      'full_name': 'GHL_FIELD_FULL_NAME',
      'fullname': 'GHL_FIELD_FULL_NAME',
      'asylum_full': 'GHL_FIELD_FULL_NAME'
    };

    matchedFields.forEach(field => {
      const key = (field.fieldKey || field.key || field.name || '').toLowerCase().replace(/\s+/g, '_');
      
      for (const [pattern, envVar] of Object.entries(envMapping)) {
        if (key.includes(pattern)) {
          console.log(`${envVar}=${field.id}`);
          break;
        }
      }
    });

    console.log('');
    console.log('=' .repeat(80));
    console.log('');
    console.log('📌 ALL CONTACT FIELDS (for reference):');
    console.log('');
    
    contactFields.forEach(field => {
      console.log(`  • ${field.name}`);
      console.log(`    ID: ${field.id}`);
      console.log(`    Key: ${field.fieldKey || field.key || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    if (error.response?.status === 401) {
      console.error('❌ Authentication failed. Your API key may be invalid or expired.');
      console.log('\nTo get a new API key:');
      console.log('1. Go to GHL Settings → Integrations → API Keys');
      console.log('2. Create a new API key with "contacts" scope');
    } else if (error.response?.status === 404) {
      console.error('❌ Location not found. Check your GHL_LOCATION_ID.');
    } else {
      console.error('❌ Error fetching custom fields:', error.response?.data || error.message);
    }
    process.exit(1);
  }
}

getCustomFields();

