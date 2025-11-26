/**
 * GHL Trigger Handler
 * 
 * Handles webhooks from GoHighLevel that trigger outbound calls.
 * - Initial contact calls (when new lead comes in)
 * - Form submission handling
 */

const vapiClient = require('../services/vapi-client');
const ghlClient = require('../services/ghl-client');
const timezoneDetector = require('../services/timezone-detector');
const callingHoursValidator = require('../services/calling-hours-validator');

class GHLTriggerHandler {
  /**
   * Handle initial outbound call trigger
   * Called by GHL workflow when contact is created
   * @param {Object} payload - GHL webhook payload
   */
  async handleInitialCall(payload) {
    const {
      contact_id,
      customer_name,
      customer_phone,
      customer_email,
      lead_source,
      custom_fields = {}
    } = payload;

    console.log('[GHL Trigger] Initial call request:', { contact_id, customer_phone });

    // Validate required fields
    if (!contact_id || !customer_phone) {
      console.error('[GHL Trigger] Missing required fields');
      return { 
        success: false, 
        error: 'Missing contact_id or customer_phone' 
      };
    }

    // Format phone number
    const formattedPhone = this.formatPhoneNumber(customer_phone);
    
    // Detect timezone
    const timezone = timezoneDetector.detectTimezone(formattedPhone);

    // Check if within calling hours
    const now = new Date();
    if (!callingHoursValidator.isWithinCallingHours(now, timezone)) {
      const nextValidTime = callingHoursValidator.getNextValidCallingTime(now, timezone);
      console.log('[GHL Trigger] Outside calling hours, scheduling for:', nextValidTime);
      
      // Update contact with scheduled time
      await ghlClient.updateCustomFields(contact_id, 
        ghlClient.buildCustomFields({
          nextCallScheduled: nextValidTime.toISOString(),
          timezone
        })
      );

      return {
        success: true,
        scheduled: true,
        scheduledTime: nextValidTime.toISOString(),
        message: 'Call scheduled for next business hours'
      };
    }

    // Initiate call via VAPI
    try {
      const call = await vapiClient.createCall({
        assistantId: process.env.VAPI_INTAKE_ASSISTANT_ID,
        phoneNumberId: process.env.VAPI_OUTBOUND_PHONE_ID,
        customerNumber: formattedPhone,
        customerName: customer_name,
        metadata: {
          contact_id,
          customer_email,
          lead_source,
          timezone,
          customerPhone: formattedPhone,
          ...custom_fields
        }
      });

      // Update contact with call info
      await ghlClient.updateCustomFields(contact_id, 
        ghlClient.buildCustomFields({
          lastCallTime: new Date().toISOString(),
          callAttempts: '1',
          timezone
        })
      );

      console.log('[GHL Trigger] Call initiated:', call.id);

      return {
        success: true,
        callId: call.id,
        message: 'Call initiated successfully'
      };

    } catch (error) {
      console.error('[GHL Trigger] Error initiating call:', error);
      
      // Update contact with error
      await ghlClient.updateCustomFields(contact_id, 
        ghlClient.buildCustomFields({
          endedReason: 'assistant-error'
        })
      );

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle form submission
   * Called when someone submits the intake form on website
   * @param {Object} payload - Form submission data
   */
  async handleFormSubmit(payload) {
    const {
      first_name,
      last_name,
      email,
      phone,
      country,
      message,
      preferred_contact
    } = payload;

    console.log('[GHL Trigger] Form submission:', { email, phone });

    // Format phone
    const formattedPhone = phone ? this.formatPhoneNumber(phone) : null;
    const timezone = formattedPhone ? timezoneDetector.detectTimezone(formattedPhone) : 'Europe/London';

    // Create or find contact
    let contact;
    if (formattedPhone) {
      contact = await ghlClient.findContactByPhone(formattedPhone);
    }

    if (!contact) {
      // Create new contact
      contact = await ghlClient.createContact({
        firstName: first_name,
        lastName: last_name,
        email,
        phone: formattedPhone,
        tags: ['asylum-intake', 'web-form'],
        customFields: ghlClient.buildCustomFields({
          currentCountry: country,
          asylumReason: message,
          preferredChannel: preferred_contact || 'email',
          timezone
        })
      });
    }

    // Determine next action based on preferred contact method
    const preferredMethod = preferred_contact || 'email';

    if (preferredMethod === 'phone' || preferredMethod === 'call') {
      // Schedule outbound call
      return this.handleInitialCall({
        contact_id: contact.id,
        customer_name: `${first_name} ${last_name}`,
        customer_phone: formattedPhone,
        customer_email: email
      });
    }

    // For SMS/WhatsApp/Email, the GHL workflow will handle it
    return {
      success: true,
      contactId: contact.id,
      preferredContact: preferredMethod,
      message: `Contact created. Will follow up via ${preferredMethod}.`
    };
  }

  /**
   * Format phone number to E.164
   * @param {string} phone - Phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If starts with 0 and looks like UK number, add +44
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = '+44' + cleaned.substring(1);
    }
    
    // If doesn't start with +, assume UK and add +44
    if (!cleaned.startsWith('+')) {
      cleaned = '+44' + cleaned;
    }
    
    return cleaned;
  }
}

module.exports = new GHLTriggerHandler();

