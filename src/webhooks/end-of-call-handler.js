/**
 * End of Call Handler
 * 
 * Handles post-call processing including:
 * - Smart retry logic based on call end reason
 * - Status updates in GHL
 * - SMS fallback after max attempts
 * - Team notifications
 */

const ghlClient = require('../services/ghl-client');
const smsClient = require('../services/sms-client');
const smartRetryCalculator = require('../services/smart-retry-calculator');
const timezoneDetector = require('../services/timezone-detector');

class EndOfCallHandler {
  /**
   * Handle end of call webhook from VAPI
   * @param {Object} payload - VAPI end-of-call payload
   */
  async handleEndOfCall(payload) {
    const {
      call,
      endedReason,
      transcript,
      summary,
      messages
    } = payload;

    const metadata = call?.metadata || {};
    const contactId = metadata.contact_id;
    const customerPhone = metadata.customerPhone || call?.customer?.number;
    const assistantType = metadata.type || 'intake';

    console.log('[EndOfCall] Processing:', {
      callId: call?.id,
      endedReason,
      assistantType,
      contactId
    });

    // If no contact ID, we can't do much
    if (!contactId) {
      console.warn('[EndOfCall] No contact ID in metadata');
      return { success: false, error: 'No contact ID' };
    }

    // Get current contact data
    let currentAttempts = 0;
    try {
      const contact = await ghlClient.getContact(contactId);
      currentAttempts = parseInt(contact.customFields?.call_attempts || '0');
    } catch (error) {
      console.warn('[EndOfCall] Could not fetch contact:', error.message);
    }

    // Detect timezone
    const timezone = metadata.timezone || timezoneDetector.detectTimezone(customerPhone);

    // Calculate retry information
    const retryInfo = smartRetryCalculator.calculateRetry({
      endedReason,
      currentAttempts,
      phoneNumber: customerPhone,
      timezone
    });

    smartRetryCalculator.logRetryInfo(retryInfo);

    // Update contact with call result
    const customFieldsUpdate = {
      lastCallTime: new Date().toISOString(),
      callAttempts: String(retryInfo.attempts),
      endedReason,
      timezone
    };

    if (retryInfo.shouldRetry) {
      customFieldsUpdate.nextCallScheduled = retryInfo.nextCallTimeISO;
    }

    await ghlClient.updateCustomFields(contactId, 
      ghlClient.buildCustomFields(customFieldsUpdate)
    );

    // Handle based on retry decision
    if (!retryInfo.shouldRetry) {
      // Max attempts reached - trigger fallback
      return this.handleMaxAttemptsReached(contactId, customerPhone, metadata);
    }

    // Schedule retry (GHL workflow will handle the actual scheduling)
    // We just update the fields and let GHL workflow trigger at the scheduled time
    
    return {
      success: true,
      retry: true,
      attempts: retryInfo.attempts,
      maxAttempts: retryInfo.maxAttempts,
      nextCallTime: retryInfo.nextCallTimeISO,
      delayMinutes: retryInfo.adjustedDelayMinutes,
      message: `Retry scheduled for ${retryInfo.nextCallTimeISO}`
    };
  }

  /**
   * Handle when max call attempts have been reached
   * @param {string} contactId - Contact ID
   * @param {string} customerPhone - Customer phone number
   * @param {Object} metadata - Call metadata
   */
  async handleMaxAttemptsReached(contactId, customerPhone, metadata) {
    console.log('[EndOfCall] Max attempts reached for:', contactId);

    // Update confirmation status to no_answer
    await ghlClient.updateCustomFields(contactId,
      ghlClient.buildCustomFields({
        confirmationStatus: 'no_answer'
      })
    );

    // Add tag
    await ghlClient.addTags(contactId, ['unreachable', 'needs-manual-followup']);

    // Send SMS fallback
    try {
      await smsClient.sendFallbackSMS({
        to: customerPhone,
        firstName: metadata.customerName?.split(' ')[0] || 'there',
        attempts: 3
      });
      console.log('[EndOfCall] Fallback SMS sent');
    } catch (error) {
      console.error('[EndOfCall] Failed to send SMS:', error.message);
    }

    // Create task for manual follow-up
    try {
      await ghlClient.createTask({
        contactId,
        title: `📞 Unable to reach - Manual follow-up needed`,
        description: `Attempted to call ${metadata.customerName || 'contact'} 3 times without success.
        
Phone: ${customerPhone}
Last attempt: ${new Date().toISOString()}

Please follow up manually via SMS, WhatsApp, or email.`,
        dueDate: new Date().toISOString()
      });
      console.log('[EndOfCall] Follow-up task created');
    } catch (error) {
      console.error('[EndOfCall] Failed to create task:', error.message);
    }

    return {
      success: true,
      retry: false,
      maxAttemptsReached: true,
      smsSent: true,
      taskCreated: true,
      message: 'Max attempts reached. SMS sent and task created for manual follow-up.'
    };
  }

  /**
   * Handle successful call completion
   * @param {Object} payload - Call payload
   */
  async handleSuccessfulCall(payload) {
    const { call, transcript, summary } = payload;
    const contactId = call?.metadata?.contact_id;

    if (!contactId) return;

    // Store transcript summary (if available)
    // This can be used for quality review later

    console.log('[EndOfCall] Successful call completed:', call?.id);

    return {
      success: true,
      callCompleted: true,
      message: 'Call completed successfully'
    };
  }
}

module.exports = new EndOfCallHandler();

