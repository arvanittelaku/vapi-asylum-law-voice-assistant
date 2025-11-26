/**
 * Deploy Confirmation Assistant to VAPI
 * 
 * Run: npm run deploy:confirmation
 */

require('dotenv').config();
const vapiClient = require('../src/services/vapi-client');
const confirmationConfig = require('../src/config/confirmation-assistant');

async function deployConfirmationAssistant() {
  console.log('============================================');
  console.log('  DEPLOYING CONFIRMATION ASSISTANT');
  console.log('============================================');

  try {
    // Check for existing assistant
    const existingId = process.env.VAPI_CONFIRMATION_ASSISTANT_ID;
    
    // Prepare config with server URL
    const config = {
      ...confirmationConfig,
      serverUrl: process.env.WEBHOOK_BASE_URL + '/webhook/vapi'
    };

    let assistant;
    
    if (existingId) {
      console.log(`Updating existing assistant: ${existingId}`);
      assistant = await vapiClient.updateAssistant(existingId, config);
    } else {
      console.log('Creating new assistant...');
      assistant = await vapiClient.createAssistant(config);
    }

    console.log('');
    console.log('✅ Confirmation Assistant deployed successfully!');
    console.log('');
    console.log('  Assistant ID:', assistant.id);
    console.log('  Name:', assistant.name);
    console.log('');
    console.log('📝 Add this to your .env file:');
    console.log(`  VAPI_CONFIRMATION_ASSISTANT_ID=${assistant.id}`);
    console.log('');
    console.log('============================================');

    return assistant;
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  deployConfirmationAssistant();
}

module.exports = deployConfirmationAssistant;

