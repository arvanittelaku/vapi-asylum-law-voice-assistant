/**
 * GHL Confirmation Handler
 * 
 * Handles confirmation call triggers from GHL.
 * Called by GHL workflow 1 hour before appointment.
 */

const vapiClient = require('../services/vapi-client');
const ghlClient = require('../services/ghl-client');
const timezoneDetector = require('../services/timezone-detector');

class GHLConfirmationHandler {
  /**
   * Handle confirmation call trigger
   * @param {Object} payload - GHL webhook payload
   */
  async handleConfirmationCall(payload) {
    const {
      contact_id,
      appointment_id,
      customer_name,
      customer_phone,
      appointment_time,
      appointment_type,
      timezone: providedTimezone
    } = payload;

    console.log('[Confirmation] Call request:', { contact_id, appointment_id, appointment_time });

    // Validate required fields
    if (!contact_id || !customer_phone || !appointment_id) {
      console.error('[Confirmation] Missing required fields');
      return {
        success: false,
        error: 'Missing required fields (contact_id, customer_phone, or appointment_id)'
      };
    }

    // Format phone and detect timezone
    const formattedPhone = this.formatPhoneNumber(customer_phone);
    const timezone = providedTimezone || timezoneDetector.detectTimezone(formattedPhone);

    // Format appointment time for voice
    const appointmentDate = new Date(appointment_time);
    const formattedTime = appointmentDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const formattedDate = appointmentDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    try {
      // Initiate confirmation call
      const call = await vapiClient.createCall({
        assistantId: process.env.VAPI_CONFIRMATION_ASSISTANT_ID,
        phoneNumberId: process.env.VAPI_CONFIRMATION_PHONE_ID,
        customerNumber: formattedPhone,
        customerName: customer_name,
        metadata: {
          contact_id,
          appointment_id,
          appointment_time,
          appointment_type: appointment_type || 'Initial Consultation',
          timezone,
          customerPhone: formattedPhone,
          customerName: customer_name,
          formattedTime,
          formattedDate,
          // These will be interpolated in the assistant's first message
          appointmentTime: `${formattedDate} at ${formattedTime}`
        }
      });

      console.log('[Confirmation] Call initiated:', call.id);

      return {
        success: true,
        callId: call.id,
        appointmentId: appointment_id,
        message: 'Confirmation call initiated'
      };

    } catch (error) {
      console.error('[Confirmation] Error initiating call:', error);

      // Update confirmation status to indicate call failed
      await ghlClient.updateCustomFields(contact_id,
        ghlClient.buildCustomFields({
          confirmationStatus: 'no_answer',
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

module.exports = new GHLConfirmationHandler();

