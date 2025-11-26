/**
 * Email Client
 * 
 * Handles sending emails via GHL or a direct email provider.
 * Used for Legal Aid referrals and team notifications.
 */

const axios = require('axios');

class EmailClient {
  constructor() {
    this.ghlApiKey = process.env.GHL_API_KEY;
    this.ghlLocationId = process.env.GHL_LOCATION_ID;
    this.baseUrl = 'https://services.leadconnectorhq.com';
  }

  /**
   * Send email via GHL conversations API
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(options) {
    const {
      to,
      subject,
      body,
      contactId,
      html = false
    } = options;

    if (!this.ghlApiKey) {
      console.warn('[EmailClient] GHL API key not set, logging email instead');
      console.log('[EmailClient] Would send email:', { to, subject, body: body.substring(0, 100) + '...' });
      return { success: true, simulated: true };
    }

    try {
      // If we have a contactId, use GHL's conversation API
      if (contactId) {
        const response = await axios.post(
          `${this.baseUrl}/conversations/messages`,
          {
            type: 'Email',
            contactId,
            message: body,
            subject,
            html
          },
          {
            headers: {
              'Authorization': `Bearer ${this.ghlApiKey}`,
              'Content-Type': 'application/json',
              'Version': '2021-07-28'
            }
          }
        );

        console.log(`[EmailClient] Email sent to contact: ${contactId}`);
        return { success: true, messageId: response.data.id };
      }

      // For external emails (like Legal Aid partner), log for now
      // In production, integrate with SendGrid, Mailgun, or GHL's email service
      console.log('[EmailClient] External email request:', {
        to,
        subject,
        bodyPreview: body.substring(0, 200)
      });

      return { success: true, logged: true };

    } catch (error) {
      console.error('[EmailClient] Error sending email:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send Legal Aid referral email
   * @param {Object} referralData - Referral information
   * @returns {Promise<Object>} Send result
   */
  async sendLegalAidReferral(referralData) {
    const {
      partnerEmail,
      partnerName,
      clientName,
      clientPhone,
      clientEmail,
      nationality,
      currentCountry,
      ukEntryDate,
      immigrationStatus,
      asylumReason,
      familyIncluded,
      familyDetails
    } = referralData;

    const to = partnerEmail || process.env.LEGAL_AID_PARTNER_EMAIL;
    const partner = partnerName || process.env.LEGAL_AID_PARTNER_NAME || 'Legal Aid Partner';

    const subject = `Legal Aid Referral: ${clientName}`;

    const body = `Dear ${partner},

Please find below a new Legal Aid referral from AsylumLaw.co.uk.

================================
CLIENT INFORMATION
================================

Name: ${clientName}
Nationality: ${nationality || 'Not provided'}
Phone: ${clientPhone || 'Not provided'}
Email: ${clientEmail || 'Not provided'}

Current Location: ${currentCountry || 'Not provided'}
UK Entry Date: ${ukEntryDate || 'Not provided'}
Immigration Status: ${immigrationStatus || 'Not provided'}

================================
ASYLUM CLAIM SUMMARY
================================

Reason for Asylum:
${asylumReason || 'Not provided'}

Family Members Included: ${familyIncluded || 'No'}
${familyDetails ? `Family Details: ${familyDetails}` : ''}

================================
NEXT STEPS
================================

The client has consented to this referral and expects contact within 48 hours.

Please confirm receipt of this referral by replying to this email.

Best regards,
AsylumLaw.co.uk Intake Team
${process.env.COMPANY_PHONE || '020 3006 9533'}
${process.env.COMPANY_EMAIL || 'help@asylumlaw.co.uk'}

---
This is an automated referral from the AsylumLaw intake system.
`;

    return this.sendEmail({
      to,
      subject,
      body,
      html: false
    });
  }

  /**
   * Send emergency notification email
   * @param {Object} emergencyData - Emergency information
   * @returns {Promise<Object>} Send result
   */
  async sendEmergencyNotification(emergencyData) {
    const {
      contactName,
      contactPhone,
      emergencyType,
      emergencyDetails,
      urgency
    } = emergencyData;

    const to = process.env.TEAM_NOTIFICATION_EMAIL;
    const subject = `🚨 URGENT: ${emergencyType} - ${contactName}`;

    const body = `
================================
EMERGENCY CASE NOTIFICATION
================================

Contact: ${contactName}
Phone: ${contactPhone}
Urgency: ${urgency || 'IMMEDIATE'}

Emergency Type: ${emergencyType}

Details:
${emergencyDetails || 'No additional details provided.'}

================================
ACTION REQUIRED
================================

Please contact this person IMMEDIATELY.

This notification was triggered by the AI intake assistant.
`;

    return this.sendEmail({ to, subject, body });
  }

  /**
   * Send team notification
   * @param {Object} options - Notification options
   * @returns {Promise<Object>} Send result
   */
  async sendTeamNotification(options) {
    const { subject, body } = options;
    const to = process.env.TEAM_NOTIFICATION_EMAIL;

    return this.sendEmail({ to, subject, body });
  }
}

module.exports = new EmailClient();

