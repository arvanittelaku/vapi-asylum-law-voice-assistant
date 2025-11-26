/**
 * SMS Client (Twilio)
 * 
 * Handles sending SMS messages for:
 * - Fallback after failed call attempts
 * - Appointment reminders
 * - Confirmation messages
 */

const twilio = require('twilio');

class SMSClient {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    this.client = null;
    
    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken);
    } else {
      console.warn('[SMSClient] Warning: Twilio credentials not set');
    }
  }

  /**
   * Send an SMS message
   * @param {string} to - Recipient phone number
   * @param {string} message - Message body
   * @returns {Promise<Object>} Send result
   */
  async sendSMS(to, message) {
    if (!this.client) {
      console.error('[SMSClient] Client not initialized');
      throw new Error('SMS client not configured');
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to
      });

      console.log(`[SMSClient] SMS sent to ${to}: ${result.sid}`);
      return {
        success: true,
        sid: result.sid,
        to,
        status: result.status
      };
    } catch (error) {
      console.error('[SMSClient] Error sending SMS:', error.message);
      throw error;
    }
  }

  /**
   * Send fallback SMS after failed call attempts
   * @param {Object} options - Message options
   * @returns {Promise<Object>} Send result
   */
  async sendFallbackSMS(options) {
    const {
      to,
      firstName,
      attempts = 3
    } = options;

    const message = `Hi ${firstName},

We tried calling you ${attempts} times about your consultation with ${process.env.COMPANY_NAME}.

📅 Book your appointment: ${process.env.BOOKING_LINK}
📞 Call us: ${process.env.COMPANY_PHONE}

- ${process.env.COMPANY_NAME} Team`;

    return this.sendSMS(to, message);
  }

  /**
   * Send appointment confirmation SMS
   * @param {Object} options - Message options
   * @returns {Promise<Object>} Send result
   */
  async sendConfirmationSMS(options) {
    const {
      to,
      firstName,
      appointmentDate,
      appointmentTime
    } = options;

    const message = `Hi ${firstName},

Your consultation with ${process.env.COMPANY_NAME} is confirmed for ${appointmentDate} at ${appointmentTime}.

We look forward to speaking with you!

📞 Need to reschedule? Call ${process.env.COMPANY_PHONE}

- ${process.env.COMPANY_NAME} Team`;

    return this.sendSMS(to, message);
  }

  /**
   * Send appointment reminder SMS
   * @param {Object} options - Message options
   * @returns {Promise<Object>} Send result
   */
  async sendReminderSMS(options) {
    const {
      to,
      firstName,
      appointmentTime
    } = options;

    const message = `Hi ${firstName},

Reminder: Your consultation with ${process.env.COMPANY_NAME} is in 1 hour at ${appointmentTime}.

We'll call you shortly. Reply RESCHEDULE if you need to change the time.

- ${process.env.COMPANY_NAME} Team`;

    return this.sendSMS(to, message);
  }

  /**
   * Send Legal Aid referral confirmation SMS
   * @param {Object} options - Message options
   * @returns {Promise<Object>} Send result
   */
  async sendLegalAidReferralSMS(options) {
    const {
      to,
      firstName
    } = options;

    const message = `Hi ${firstName},

We've referred your case to our Legal Aid partner. They will contact you within 48 hours.

Legal Aid typically involves longer waiting times but covers the full cost of representation.

If you'd prefer faster private support, call us: ${process.env.COMPANY_PHONE}

- ${process.env.COMPANY_NAME} Team`;

    return this.sendSMS(to, message);
  }

  /**
   * Send booking link SMS
   * @param {Object} options - Message options
   * @returns {Promise<Object>} Send result
   */
  async sendBookingLinkSMS(options) {
    const {
      to,
      firstName,
      bookingLink
    } = options;

    const link = bookingLink || process.env.BOOKING_LINK;

    const message = `Hi ${firstName},

Thank you for contacting ${process.env.COMPANY_NAME}. 

Book your free consultation here: ${link}

Questions? Call us: ${process.env.COMPANY_PHONE}

- ${process.env.COMPANY_NAME} Team`;

    return this.sendSMS(to, message);
  }

  /**
   * Test SMS connection
   * @returns {Promise<boolean>} True if connected
   */
  async testConnection() {
    if (!this.client) {
      return false;
    }
    
    try {
      await this.client.api.accounts(this.accountSid).fetch();
      console.log('[SMSClient] Connection test successful');
      return true;
    } catch (error) {
      console.error('[SMSClient] Connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = new SMSClient();

