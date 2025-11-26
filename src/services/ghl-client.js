/**
 * GoHighLevel API Client
 * 
 * Handles all interactions with GHL CRM including contacts,
 * calendar, appointments, and custom fields.
 */

const axios = require('axios');

class GHLClient {
  constructor() {
    this.apiKey = process.env.GHL_API_KEY;
    this.locationId = process.env.GHL_LOCATION_ID;
    this.calendarId = process.env.GHL_CALENDAR_ID;
    this.baseUrl = 'https://services.leadconnectorhq.com';
    
    if (!this.apiKey) {
      console.warn('[GHLClient] Warning: GHL_API_KEY not set');
    }
  }

  /**
   * Get axios instance with auth headers
   */
  getClient() {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    });
  }

  // ============================================
  // CONTACT METHODS
  // ============================================

  /**
   * Create a new contact
   * @param {Object} contactData - Contact information
   * @returns {Promise<Object>} Created contact
   */
  async createContact(contactData) {
    try {
      const payload = {
        locationId: this.locationId,
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        email: contactData.email,
        phone: contactData.phone,
        tags: contactData.tags || ['asylum-intake'],
        customFields: contactData.customFields || []
      };

      const response = await this.getClient().post('/contacts/', payload);
      console.log(`[GHLClient] Contact created: ${response.data.contact.id}`);
      return response.data.contact;
    } catch (error) {
      console.error('[GHLClient] Error creating contact:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update an existing contact
   * @param {string} contactId - Contact ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated contact
   */
  async updateContact(contactId, updates) {
    try {
      const response = await this.getClient().put(`/contacts/${contactId}`, updates);
      console.log(`[GHLClient] Contact updated: ${contactId}`);
      return response.data.contact;
    } catch (error) {
      console.error('[GHLClient] Error updating contact:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get contact by ID
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object>} Contact details
   */
  async getContact(contactId) {
    try {
      const response = await this.getClient().get(`/contacts/${contactId}`);
      return response.data.contact;
    } catch (error) {
      console.error('[GHLClient] Error getting contact:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Search contacts by phone number
   * @param {string} phone - Phone number
   * @returns {Promise<Object|null>} Contact or null
   */
  async findContactByPhone(phone) {
    try {
      const response = await this.getClient().get('/contacts/', {
        params: {
          locationId: this.locationId,
          query: phone
        }
      });
      return response.data.contacts?.[0] || null;
    } catch (error) {
      console.error('[GHLClient] Error finding contact:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update contact custom fields
   * @param {string} contactId - Contact ID
   * @param {Array} customFields - Array of {id, value} objects
   * @returns {Promise<Object>} Updated contact
   */
  async updateCustomFields(contactId, customFields) {
    try {
      const response = await this.getClient().put(`/contacts/${contactId}`, {
        customFields
      });
      console.log(`[GHLClient] Custom fields updated for: ${contactId}`);
      return response.data.contact;
    } catch (error) {
      console.error('[GHLClient] Error updating custom fields:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Add tags to contact
   * @param {string} contactId - Contact ID
   * @param {Array<string>} tags - Tags to add
   * @returns {Promise<Object>} Updated contact
   */
  async addTags(contactId, tags) {
    try {
      const response = await this.getClient().post(`/contacts/${contactId}/tags`, {
        tags
      });
      console.log(`[GHLClient] Tags added to: ${contactId}`);
      return response.data;
    } catch (error) {
      console.error('[GHLClient] Error adding tags:', error.response?.data || error.message);
      throw error;
    }
  }

  // ============================================
  // CALENDAR METHODS
  // ============================================

  /**
   * Get available time slots
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} timezone - Timezone (e.g., 'Europe/London')
   * @returns {Promise<Array>} Available slots
   */
  async getAvailableSlots(date, timezone = 'Europe/London') {
    try {
      // GHL Calendar API requires Unix timestamps in MILLISECONDS
      const startOfDay = new Date(`${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59`);
      
      const startDate = startOfDay.getTime(); // Unix timestamp in ms
      const endDate = endOfDay.getTime();     // Unix timestamp in ms
      
      console.log(`[GHLClient] Checking slots for ${date} (${startDate} to ${endDate})`);
      
      const response = await this.getClient().get(`/calendars/${this.calendarId}/free-slots`, {
        params: {
          startDate,
          endDate,
          timezone
        }
      });
      
      // GHL returns: { "2025-11-28": { slots: ["2025-11-28T09:00:00Z", ...] } }
      let rawSlots = [];
      
      // Check various response formats
      if (response.data?.[date]?.slots) {
        // Primary format: { "2025-11-28": { slots: [...] } }
        rawSlots = response.data[date].slots;
      } else if (response.data?.slots?.[date]?.slots) {
        // Alternative: { slots: { "2025-11-28": { slots: [...] } } }
        rawSlots = response.data.slots[date].slots;
      } else if (Array.isArray(response.data?.slots)) {
        // Direct slots array
        rawSlots = response.data.slots;
      } else if (Array.isArray(response.data)) {
        rawSlots = response.data;
      }
      
      console.log(`[GHLClient] Found ${rawSlots.length} raw slots for ${date}`);
      
      // Format slots as readable times (HH:mm) in UK timezone
      const formattedSlots = rawSlots.map(slot => {
        if (typeof slot === 'string' && slot.includes('T')) {
          // ISO string like "2025-11-28T09:00:00Z"
          const time = new Date(slot);
          // Get hours and minutes in London timezone
          return time.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false,
            timeZone: timezone
          });
        } else if (slot.startTime) {
          // Object with startTime property
          const time = new Date(slot.startTime);
          return time.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false,
            timeZone: timezone
          });
        }
        return slot;
      });
      
      console.log(`[GHLClient] Formatted slots:`, formattedSlots.slice(0, 5).join(', ') + '...');
      
      return formattedSlots;
    } catch (error) {
      console.error('[GHLClient] Error getting available slots:', error.response?.data || error.message);
      
      // Return empty array instead of throwing - allows conversation to continue
      if (error.response?.status === 422 || error.response?.status === 400) {
        console.warn('[GHLClient] Calendar API returned validation error - returning empty slots');
        return [];
      }
      throw error;
    }
  }

  /**
   * Book an appointment
   * @param {Object} appointmentData - Appointment details
   * @returns {Promise<Object>} Created appointment
   */
  async bookAppointment(appointmentData) {
    const {
      contactId,
      date,
      time,
      timezone = 'Europe/London',
      title = 'Initial Consultation',
      notes = ''
    } = appointmentData;

    try {
      // Combine date and time into ISO format
      // IMPORTANT: Append 'Z' to treat as UTC (GHL calendar slots are in UTC)
      // Without 'Z', JavaScript interprets as local time which causes timezone bugs
      const startTime = `${date}T${time}:00Z`;
      
      // Default 30-minute appointment
      const endTimeDate = new Date(startTime);
      endTimeDate.setMinutes(endTimeDate.getMinutes() + 30);
      const endTime = endTimeDate.toISOString();

      const payload = {
        calendarId: this.calendarId,
        locationId: this.locationId,
        contactId,
        startTime,
        endTime,
        title,
        appointmentStatus: 'confirmed',
        notes
      };

      const response = await this.getClient().post('/calendars/events/appointments', payload);
      console.log(`[GHLClient] Appointment booked: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('[GHLClient] Error booking appointment:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Cancel an appointment
   * Note: Uses PUT to update status instead of DELETE due to GHL IAM restrictions
   * @param {string} appointmentId - Appointment ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Result
   */
  async cancelAppointment(appointmentId, reason = '') {
    try {
      // Use PUT to update status to 'cancelled' instead of DELETE
      // DELETE requires additional IAM permissions in GHL
      const response = await this.getClient().put(
        `/calendars/events/appointments/${appointmentId}`,
        { 
          appointmentStatus: 'cancelled',
          notes: reason || 'Cancelled by customer'
        }
      );
      console.log(`[GHLClient] Appointment cancelled: ${appointmentId}, Reason: ${reason}`);
      return { success: true, appointmentId, reason, status: 'cancelled' };
    } catch (error) {
      console.error('[GHLClient] Error cancelling appointment:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get appointment details
   * @param {string} appointmentId - Appointment ID
   * @returns {Promise<Object>} Appointment details
   */
  async getAppointment(appointmentId) {
    try {
      const response = await this.getClient().get(`/calendars/events/appointments/${appointmentId}`);
      return response.data;
    } catch (error) {
      console.error('[GHLClient] Error getting appointment:', error.response?.data || error.message);
      throw error;
    }
  }

  // ============================================
  // WORKFLOW METHODS
  // ============================================

  /**
   * Add contact to workflow
   * @param {string} contactId - Contact ID
   * @param {string} workflowId - Workflow ID
   * @returns {Promise<Object>} Result
   */
  async addToWorkflow(contactId, workflowId) {
    try {
      const response = await this.getClient().post(`/contacts/${contactId}/workflow/${workflowId}`);
      console.log(`[GHLClient] Contact ${contactId} added to workflow ${workflowId}`);
      return response.data;
    } catch (error) {
      console.error('[GHLClient] Error adding to workflow:', error.response?.data || error.message);
      throw error;
    }
  }

  // ============================================
  // TASK METHODS
  // ============================================

  /**
   * Create a task for team follow-up
   * @param {Object} taskData - Task details
   * @returns {Promise<Object>} Created task
   */
  async createTask(taskData) {
    const {
      contactId,
      title,
      description,
      dueDate = new Date().toISOString(),
      assignedTo
    } = taskData;

    try {
      // GHL API v2 - tasks endpoint requires contact ID in path
      // If no contactId, we'll create a general task using notes instead
      if (contactId) {
        const payload = {
          title,
          body: description,
          dueDate,
          completed: false
        };
        if (assignedTo) payload.assignedTo = assignedTo;

        const response = await this.getClient().post(`/contacts/${contactId}/tasks`, payload);
        console.log(`[GHLClient] Task created: ${response.data.id}`);
        return response.data;
      } else {
        // For tasks without contact, add as a note or log
        console.log(`[GHLClient] Task created (no contact): ${title}`);
        console.log(`[GHLClient] Description: ${description}`);
        return { id: 'local-' + Date.now(), title, description, logged: true };
      }
    } catch (error) {
      console.error('[GHLClient] Error creating task:', error.response?.data || error.message);
      // Return a local task instead of throwing
      console.log(`[GHLClient] Falling back to local task logging`);
      return { id: 'local-' + Date.now(), title, description, fallback: true };
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Test API connection
   * @returns {Promise<boolean>} True if connected
   */
  async testConnection() {
    try {
      const response = await this.getClient().get('/locations/', {
        params: { companyId: this.locationId }
      });
      console.log('[GHLClient] Connection test successful');
      return true;
    } catch (error) {
      console.error('[GHLClient] Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Build custom fields array for updates
   * @param {Object} fields - Key-value pairs of field names to values
   * @returns {Array} Formatted custom fields array
   */
  buildCustomFields(fields) {
    // Mapping from our internal names to GHL custom field IDs
    // EXISTING FIELDS (already in GHL):
    // - asylum_nationality, current_residence, uk_entry_date
    // - asylum_brief_reason, asylum_family_included, asylum_family_details
    // - asylum_triage, asylum_preferred_channel_of_communication, asylum_full_name
    //
    // NEW FIELDS (need to be created):
    // - asylum_immigration_status, call_attempts, confirmation_status
    // - emergency_flag, emergency_type, interpreter_needed, interpreter_language
    // - last_call_time, next_call_scheduled, call_end_reason
    
    const fieldMapping = {
      // Existing asylum fields
      nationality: process.env.GHL_FIELD_NATIONALITY,
      currentCountry: process.env.GHL_FIELD_CURRENT_COUNTRY,
      ukEntryDate: process.env.GHL_FIELD_UK_ENTRY_DATE,
      asylumReason: process.env.GHL_FIELD_ASYLUM_REASON,
      familyIncluded: process.env.GHL_FIELD_FAMILY_INCLUDED,
      familyDetails: process.env.GHL_FIELD_FAMILY_DETAILS,
      triageStatus: process.env.GHL_FIELD_TRIAGE_STATUS,
      preferredChannel: process.env.GHL_FIELD_PREFERRED_CHANNEL,
      fullName: process.env.GHL_FIELD_FULL_NAME,
      
      // New fields to create
      immigrationStatus: process.env.GHL_FIELD_IMMIGRATION_STATUS,
      callAttempts: process.env.GHL_FIELD_CALL_ATTEMPTS,
      confirmationStatus: process.env.GHL_FIELD_CONFIRMATION_STATUS,
      emergencyFlag: process.env.GHL_FIELD_EMERGENCY_FLAG,
      emergencyType: process.env.GHL_FIELD_EMERGENCY_TYPE,
      interpreterNeeded: process.env.GHL_FIELD_INTERPRETER_NEEDED,
      interpreterLanguage: process.env.GHL_FIELD_INTERPRETER_LANGUAGE,
      lastCallTime: process.env.GHL_FIELD_LAST_CALL_TIME,
      nextCallScheduled: process.env.GHL_FIELD_NEXT_CALL_SCHEDULED,
      endedReason: process.env.GHL_FIELD_ENDED_REASON
    };

    const customFields = [];
    for (const [key, value] of Object.entries(fields)) {
      if (fieldMapping[key] && value !== undefined) {
        customFields.push({
          id: fieldMapping[key],
          value: String(value)
        });
      }
    }
    return customFields;
  }
}

module.exports = new GHLClient();

