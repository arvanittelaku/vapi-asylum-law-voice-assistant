/**
 * VAPI API Client
 * 
 * Handles all interactions with the VAPI voice AI platform.
 */

const axios = require('axios');

class VapiClient {
  constructor() {
    this.apiKey = process.env.VAPI_API_KEY;
    this.baseUrl = 'https://api.vapi.ai';
    
    if (!this.apiKey) {
      console.warn('[VapiClient] Warning: VAPI_API_KEY not set');
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
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create a new assistant
   * @param {Object} config - Assistant configuration
   * @returns {Promise<Object>} Created assistant
   */
  async createAssistant(config) {
    try {
      const response = await this.getClient().post('/assistant', config);
      console.log(`[VapiClient] Assistant created: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('[VapiClient] Error creating assistant:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update an existing assistant
   * @param {string} assistantId - Assistant ID
   * @param {Object} config - Updated configuration
   * @returns {Promise<Object>} Updated assistant
   */
  async updateAssistant(assistantId, config) {
    try {
      const response = await this.getClient().patch(`/assistant/${assistantId}`, config);
      console.log(`[VapiClient] Assistant updated: ${assistantId}`);
      return response.data;
    } catch (error) {
      console.error('[VapiClient] Error updating assistant:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get assistant by ID
   * @param {string} assistantId - Assistant ID
   * @returns {Promise<Object>} Assistant details
   */
  async getAssistant(assistantId) {
    try {
      const response = await this.getClient().get(`/assistant/${assistantId}`);
      return response.data;
    } catch (error) {
      console.error('[VapiClient] Error getting assistant:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * List all assistants
   * @returns {Promise<Array>} List of assistants
   */
  async listAssistants() {
    try {
      const response = await this.getClient().get('/assistant');
      return response.data;
    } catch (error) {
      console.error('[VapiClient] Error listing assistants:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Initiate an outbound call
   * @param {Object} options - Call options
   * @returns {Promise<Object>} Call details
   */
  async createCall(options) {
    const {
      assistantId,
      phoneNumberId,
      customerNumber,
      customerName,
      metadata = {}
    } = options;

    try {
      const payload = {
        assistantId,
        phoneNumberId,
        customer: {
          number: customerNumber,
          name: customerName
        },
        metadata
      };

      const response = await this.getClient().post('/call/phone', payload);
      console.log(`[VapiClient] Call initiated: ${response.data.id} to ${customerNumber}`);
      return response.data;
    } catch (error) {
      console.error('[VapiClient] Error creating call:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get call details
   * @param {string} callId - Call ID
   * @returns {Promise<Object>} Call details
   */
  async getCall(callId) {
    try {
      const response = await this.getClient().get(`/call/${callId}`);
      return response.data;
    } catch (error) {
      console.error('[VapiClient] Error getting call:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * End an active call
   * @param {string} callId - Call ID
   * @returns {Promise<Object>} Result
   */
  async endCall(callId) {
    try {
      const response = await this.getClient().post(`/call/${callId}/end`);
      console.log(`[VapiClient] Call ended: ${callId}`);
      return response.data;
    } catch (error) {
      console.error('[VapiClient] Error ending call:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Import a phone number
   * @param {Object} options - Phone number options
   * @returns {Promise<Object>} Phone number details
   */
  async importPhoneNumber(options) {
    try {
      const response = await this.getClient().post('/phone-number', options);
      console.log(`[VapiClient] Phone number imported: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('[VapiClient] Error importing phone number:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Assign assistant to phone number
   * @param {string} phoneNumberId - Phone number ID
   * @param {string} assistantId - Assistant ID to assign
   * @returns {Promise<Object>} Updated phone number
   */
  async assignAssistantToPhoneNumber(phoneNumberId, assistantId) {
    try {
      const response = await this.getClient().patch(`/phone-number/${phoneNumberId}`, {
        assistantId
      });
      console.log(`[VapiClient] Assistant ${assistantId} assigned to phone ${phoneNumberId}`);
      return response.data;
    } catch (error) {
      console.error('[VapiClient] Error assigning assistant:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Test API connection
   * @returns {Promise<boolean>} True if connected
   */
  async testConnection() {
    try {
      await this.listAssistants();
      console.log('[VapiClient] Connection test successful');
      return true;
    } catch (error) {
      console.error('[VapiClient] Connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = new VapiClient();

