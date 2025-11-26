/**
 * Smart Retry Calculator
 * 
 * Calculates intelligent retry delays based on:
 * - Why the call ended (no answer, hung up, busy, error)
 * - Current attempt number
 * - Customer's timezone
 * - Business hours
 */

const timezoneDetector = require('./timezone-detector');
const callingHoursValidator = require('./calling-hours-validator');

// Retry delays in minutes based on end reason
const RETRY_DELAYS = {
  // Customer didn't answer (voicemail, no pickup)
  'customer-did-not-answer': [30, 120, 240],     // 30 min, 2 hours, 4 hours
  
  // Customer hung up mid-conversation
  'customer-ended-call': [120, 360, 1440],        // 2 hours, 6 hours, 24 hours
  
  // Customer said they're busy
  'customer-busy': [60, 240, 720],                // 1 hour, 4 hours, 12 hours
  
  // Technical/assistant error
  'assistant-error': [5, 15, 30],                 // 5 min, 15 min, 30 min
  
  // Default fallback
  'default': [60, 180, 360]                       // 1 hour, 3 hours, 6 hours
};

// Maximum retry attempts
const MAX_ATTEMPTS = 3;

class SmartRetryCalculator {
  /**
   * Calculate retry information
   * @param {Object} options - Calculation options
   * @returns {Object} Retry information
   */
  calculateRetry(options) {
    const {
      endedReason,
      currentAttempts = 0,
      phoneNumber,
      timezone: providedTimezone
    } = options;

    // Detect timezone from phone if not provided
    const timezone = providedTimezone || timezoneDetector.detectTimezone(phoneNumber);
    
    // Check if we've exceeded max attempts
    if (currentAttempts >= MAX_ATTEMPTS) {
      return {
        shouldRetry: false,
        reason: 'max_attempts_reached',
        attempts: currentAttempts,
        maxAttempts: MAX_ATTEMPTS,
        action: 'send_sms_fallback'
      };
    }

    // Get delay configuration for this end reason
    const delays = RETRY_DELAYS[endedReason] || RETRY_DELAYS['default'];
    const delayMinutes = delays[currentAttempts] || delays[delays.length - 1];

    // Calculate next call time respecting business hours
    const { adjustedTime, adjustedDelay, withinHours } = 
      callingHoursValidator.calculateDelayWithinHours(delayMinutes, timezone);

    return {
      shouldRetry: true,
      attempts: currentAttempts + 1,
      maxAttempts: MAX_ATTEMPTS,
      originalDelayMinutes: delayMinutes,
      adjustedDelayMinutes: adjustedDelay,
      nextCallTime: adjustedTime,
      nextCallTimeISO: adjustedTime.toISOString(),
      timezone,
      wasAdjustedForBusinessHours: !withinHours,
      endedReason
    };
  }

  /**
   * Determine if SMS fallback should be triggered
   * @param {number} attempts - Current attempt count
   * @returns {boolean} True if should send SMS
   */
  shouldSendSMSFallback(attempts) {
    return attempts >= MAX_ATTEMPTS;
  }

  /**
   * Get human-readable delay description
   * @param {number} minutes - Delay in minutes
   * @returns {string} Human-readable string
   */
  getDelayDescription(minutes) {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes < 1440) {
      const hours = Math.round(minutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.round(minutes / 1440);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  }

  /**
   * Log retry calculation for debugging
   * @param {Object} retryInfo - Retry information
   */
  logRetryInfo(retryInfo) {
    if (retryInfo.shouldRetry) {
      console.log('[SmartRetry] Scheduling retry:', {
        attempt: `${retryInfo.attempts}/${retryInfo.maxAttempts}`,
        reason: retryInfo.endedReason,
        nextCall: retryInfo.nextCallTimeISO,
        delay: this.getDelayDescription(retryInfo.adjustedDelayMinutes),
        timezone: retryInfo.timezone,
        adjusted: retryInfo.wasAdjustedForBusinessHours
      });
    } else {
      console.log('[SmartRetry] Max attempts reached:', {
        attempts: retryInfo.attempts,
        action: retryInfo.action
      });
    }
  }

  /**
   * Get retry configuration summary
   * @returns {Object} Configuration details
   */
  getConfiguration() {
    return {
      maxAttempts: MAX_ATTEMPTS,
      delays: RETRY_DELAYS,
      businessHours: callingHoursValidator.getBusinessHoursInfo()
    };
  }
}

module.exports = new SmartRetryCalculator();

