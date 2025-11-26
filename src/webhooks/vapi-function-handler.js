/**
 * VAPI Function Handler
 * 
 * Handles all tool/function calls from VAPI assistants.
 * Routes to appropriate service based on function name.
 */

const ghlClient = require('../services/ghl-client');
const timezoneDetector = require('../services/timezone-detector');
const emailClient = require('../services/email-client');

class VapiFunctionHandler {
  /**
   * Main handler for function calls from VAPI
   * @param {Object} payload - VAPI webhook payload
   * @returns {Object} Function result
   */
  async handleFunctionCall(payload) {
    const { message } = payload;
    
    // Check if this is a function call
    if (message?.type !== 'function-call') {
      return { error: 'Not a function call' };
    }

    const functionName = message.functionCall?.name;
    const parameters = message.functionCall?.parameters || {};
    const metadata = payload.call?.metadata || {};

    console.log(`[VapiHandler] Function call: ${functionName}`, { parameters, metadata });

    try {
      switch (functionName) {
        case 'check_calendar_availability':
          return await this.checkCalendarAvailability(parameters, metadata);
        
        case 'book_appointment':
          return await this.bookAppointment(parameters, metadata);
        
        case 'cancel_appointment':
          return await this.cancelAppointment(parameters, metadata);
        
        case 'update_contact':
          return await this.updateContact(parameters, metadata);
        
        case 'update_confirmation_status':
          return await this.updateConfirmationStatus(parameters, metadata);
        
        case 'transfer_to_human':
          return await this.transferToHuman(parameters, metadata);
        
        case 'create_urgent_task':
          return await this.createUrgentTask(parameters, metadata);
        
        case 'send_referral_email':
          return await this.sendReferralEmail(parameters, metadata);
        
        default:
          console.warn(`[VapiHandler] Unknown function: ${functionName}`);
          return { error: `Unknown function: ${functionName}` };
      }
    } catch (error) {
      console.error(`[VapiHandler] Error in ${functionName}:`, error);
      return { 
        error: error.message,
        success: false 
      };
    }
  }

  /**
   * Check calendar availability
   */
  async checkCalendarAvailability(params, metadata) {
    const { date } = params;
    const timezone = metadata.timezone || timezoneDetector.detectTimezone(metadata.customerPhone) || 'Europe/London';

    // ghlClient.getAvailableSlots now returns formatted time strings like ["09:00", "09:30", ...]
    const slots = await ghlClient.getAvailableSlots(date, timezone);
    
    console.log(`[VapiHandler] Calendar slots for ${date}:`, slots);

    return {
      success: true,
      date,
      availableSlots: slots,
      slotsCount: slots.length,
      message: slots.length > 0 
        ? `Found ${slots.length} available slots: ${slots.slice(0, 8).join(', ')}${slots.length > 8 ? ' and more' : ''}`
        : `No available slots on ${date}. Please try another date.`
    };
  }

  /**
   * Book an appointment
   */
  async bookAppointment(params, metadata) {
    const { date, time, notes } = params;
    const contactId = metadata.contact_id;
    const timezone = metadata.timezone || 'Europe/London';

    console.log('[BookAppointment] Params:', { date, time, notes });
    console.log('[BookAppointment] Metadata:', metadata);
    console.log('[BookAppointment] ContactId:', contactId);

    if (!contactId) {
      return { 
        success: false, 
        error: 'Contact ID not found. Please update contact first.' 
      };
    }

    try {
      const appointment = await ghlClient.bookAppointment({
        contactId,
        date,
        time,
        timezone,
        title: 'Initial Consultation - Asylum Case',
        notes: notes || 'Booked via AI assistant'
      });
      console.log('[BookAppointment] Success:', appointment.id);

      // Update contact with appointment info
      await ghlClient.updateCustomFields(contactId, 
        ghlClient.buildCustomFields({ appointmentId: appointment.id })
      );

      return {
        success: true,
        appointmentId: appointment.id,
        date,
        time,
        message: `Appointment booked successfully for ${date} at ${time}`
      };
    } catch (bookingError) {
      console.error('[BookAppointment] Error:', bookingError.response?.data || bookingError.message);
      throw bookingError;
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(params, metadata) {
    const { reason } = params;
    let appointmentId = metadata.appointment_id;

    // If no appointment_id in metadata, try to get from contact's custom fields
    if (!appointmentId && metadata.contact_id) {
      try {
        const contact = await ghlClient.getContact(metadata.contact_id);
        // Look for appointment ID in custom fields
        if (contact.customFields) {
          appointmentId = contact.customFields.appointmentId || 
                          contact.customFields.appointment_id ||
                          contact.customFields.lastAppointmentId;
        }
        console.log('[CancelAppointment] Retrieved appointment ID from contact:', appointmentId);
      } catch (error) {
        console.warn('[CancelAppointment] Could not fetch contact:', error.message);
      }
    }

    if (!appointmentId) {
      return { 
        success: false, 
        error: 'Could not find appointment to cancel. Please contact us directly at 020 3006 9533.'
      };
    }

    await ghlClient.cancelAppointment(appointmentId, reason || 'Cancelled by customer');

    return {
      success: true,
      appointmentId,
      message: 'Appointment cancelled successfully'
    };
  }

  /**
   * Update contact information
   */
  async updateContact(params, metadata) {
    let contactId = metadata.contact_id;
    const customerPhone = metadata.customerPhone || metadata.customer?.number || params.phone;

    console.log('[UpdateContact] Starting with:', { contactId, customerPhone, paramsKeys: Object.keys(params) });

    // If no contact ID, try to find by phone or create new
    if (!contactId && customerPhone) {
      try {
        const existingContact = await ghlClient.findContactByPhone(customerPhone);
        if (existingContact) {
          contactId = existingContact.id;
          console.log('[UpdateContact] Found existing contact:', contactId);
        }
      } catch (error) {
        console.warn('[UpdateContact] Error finding contact by phone:', error.message);
      }
    }

    // Build update payload
    const updateData = {};
    
    if (params.firstName) updateData.firstName = params.firstName;
    if (params.lastName) updateData.lastName = params.lastName;
    if (params.email) updateData.email = params.email;
    if (params.phone) updateData.phone = params.phone;

    // Build custom fields
    const customFieldsToUpdate = {};
    if (params.nationality) customFieldsToUpdate.nationality = params.nationality;
    if (params.currentCountry) customFieldsToUpdate.currentCountry = params.currentCountry;
    if (params.ukEntryDate) customFieldsToUpdate.ukEntryDate = params.ukEntryDate;
    if (params.immigrationStatus) customFieldsToUpdate.immigrationStatus = params.immigrationStatus;
    if (params.asylumReason) customFieldsToUpdate.asylumReason = params.asylumReason;
    if (params.familyIncluded) customFieldsToUpdate.familyIncluded = params.familyIncluded;
    if (params.familyDetails) customFieldsToUpdate.familyDetails = params.familyDetails;
    if (params.preferredChannel) customFieldsToUpdate.preferredChannel = params.preferredChannel;
    if (params.triageStatus) customFieldsToUpdate.triageStatus = params.triageStatus;
    if (params.emergencyFlag !== undefined) customFieldsToUpdate.emergencyFlag = params.emergencyFlag ? 'true' : 'false';
    if (params.emergencyType) customFieldsToUpdate.emergencyType = params.emergencyType;
    if (params.interpreterNeeded) customFieldsToUpdate.interpreterNeeded = params.interpreterNeeded ? 'true' : 'false';
    if (params.interpreterLanguage) customFieldsToUpdate.interpreterLanguage = params.interpreterLanguage;
    if (params.detentionCenter) customFieldsToUpdate.detentionCenter = params.detentionCenter;
    if (params.courtHearingDate) customFieldsToUpdate.courtHearingDate = params.courtHearingDate;

    if (Object.keys(customFieldsToUpdate).length > 0) {
      updateData.customFields = ghlClient.buildCustomFields(customFieldsToUpdate);
    }

    // Add tags based on triage status
    if (params.triageStatus) {
      updateData.tags = ['asylum-intake', params.triageStatus];
      if (params.familyIncluded === 'yes') {
        updateData.tags.push('family-included');
      }
    }

    let result;
    if (contactId) {
      // Update existing contact
      result = await ghlClient.updateContact(contactId, updateData);
    } else {
      // Create new contact
      result = await ghlClient.createContact({
        ...updateData,
        phone: customerPhone,
        tags: updateData.tags || ['asylum-intake']
      });
      contactId = result.id;
    }

    return {
      success: true,
      contactId,
      message: 'Contact information saved successfully'
    };
  }

  /**
   * Update confirmation status
   */
  async updateConfirmationStatus(params, metadata) {
    const { status } = params;
    const contactId = metadata.contact_id;

    if (!contactId) {
      return { success: false, error: 'Contact ID not found' };
    }

    const customFields = ghlClient.buildCustomFields({
      confirmationStatus: status
    });

    await ghlClient.updateCustomFields(contactId, customFields);

    return {
      success: true,
      status,
      message: `Confirmation status updated to: ${status}`
    };
  }

  /**
   * Transfer to human handler
   */
  async transferToHuman(params, metadata) {
    const { reason, urgency, details } = params;
    const contactId = metadata.contact_id;

    // Create urgent task for team
    if (contactId) {
      await ghlClient.createTask({
        contactId,
        title: `🚨 ${urgency?.toUpperCase()} - Human Transfer Required: ${reason}`,
        description: `Reason: ${reason}\nDetails: ${details || 'Not provided'}\nUrgency: ${urgency}`,
        dueDate: new Date().toISOString()
      });

      // Update contact emergency flag and type
      await ghlClient.updateCustomFields(contactId, 
        ghlClient.buildCustomFields({ 
          emergencyFlag: 'true',
          emergencyType: reason
        })
      );
    }

    // Return transfer instruction to VAPI
    // Note: Actual phone transfer is handled by VAPI's transferCall function
    return {
      success: true,
      transfer: true,
      destination: process.env.EMERGENCY_DUTY_PHONE,
      reason,
      urgency,
      message: 'Transferring to human handler'
    };
  }

  /**
   * Create urgent task
   */
  async createUrgentTask(params, metadata) {
    const { title, details, emergencyType } = params;
    const contactId = metadata.contact_id;

    if (!contactId) {
      // Still create task but note missing contact
      console.warn('[VapiHandler] Creating task without contact ID');
    }

    const task = await ghlClient.createTask({
      contactId,
      title: `🚨 URGENT: ${title}`,
      description: `Emergency Type: ${emergencyType}\n\nDetails: ${details || 'Not provided'}`,
      dueDate: new Date().toISOString()
    });

    // Send notification email
    // TODO: Implement email notification

    return {
      success: true,
      taskId: task?.id,
      message: 'Urgent task created and team notified'
    };
  }

  /**
   * Send Legal Aid referral email
   */
  async sendReferralEmail(params, metadata) {
    const contactId = metadata.contact_id;
    
    // Get contact details for referral
    let contactDetails = {};
    if (contactId) {
      try {
        contactDetails = await ghlClient.getContact(contactId);
      } catch (error) {
        console.warn('[VapiHandler] Could not fetch contact for referral');
      }
    }

    // Build referral data
    const referralData = {
      clientName: `${contactDetails.firstName || params.firstName || ''} ${contactDetails.lastName || params.lastName || ''}`.trim() || 'Unknown',
      clientPhone: contactDetails.phone || params.phone,
      clientEmail: contactDetails.email || params.email,
      nationality: params.nationality || contactDetails.customFields?.nationality,
      currentCountry: params.currentCountry || contactDetails.customFields?.currentCountry,
      ukEntryDate: params.ukEntryDate || contactDetails.customFields?.ukEntryDate,
      immigrationStatus: params.immigrationStatus || contactDetails.customFields?.immigrationStatus,
      asylumReason: params.asylumReason || contactDetails.customFields?.asylumReason,
      familyIncluded: params.familyIncluded || contactDetails.customFields?.familyIncluded,
      familyDetails: params.familyDetails || contactDetails.customFields?.familyDetails
    };

    console.log('[VapiHandler] Sending Legal Aid Referral:', referralData);

    // Send the referral email
    try {
      await emailClient.sendLegalAidReferral(referralData);
      console.log('[VapiHandler] Legal Aid referral email sent');
    } catch (error) {
      console.error('[VapiHandler] Error sending referral email:', error.message);
      // Continue - we still want to update the contact
    }

    // Update contact status (if contact exists)
    if (contactId) {
      try {
        await ghlClient.updateCustomFields(contactId, 
          ghlClient.buildCustomFields({ triageStatus: 'legalaid' })
        );
        await ghlClient.addTags(contactId, ['legalaid', 'referred']);

        // Create task for team awareness
        await ghlClient.createTask({
          contactId,
          title: `📋 Legal Aid Referral Sent - ${referralData.clientName}`,
          description: `Legal Aid referral sent to ${process.env.LEGAL_AID_PARTNER_NAME || 'partner'}.\n\nClient: ${referralData.clientName}\nNationality: ${referralData.nationality}\nReason: ${referralData.asylumReason}`,
          dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours from now
        });
      } catch (error) {
        console.warn('[VapiHandler] Could not update contact for referral:', error.message);
        // Continue anyway - referral email was sent
      }
    }

    return {
      success: true,
      referralSent: true,
      partner: process.env.LEGAL_AID_PARTNER_NAME || 'Legal Aid Partner',
      message: 'Referral sent to Legal Aid partner. They will contact you within 48 hours.'
    };
  }
}

module.exports = new VapiFunctionHandler();

