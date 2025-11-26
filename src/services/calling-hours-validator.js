/**
 * Calling Hours Validator
 * 
 * Validates if a given time is within business hours for calling.
 * Respects customer's timezone.
 */

const { DateTime } = require('luxon');

class CallingHoursValidator {
  constructor() {
    // Parse business hours from environment
    this.startHour = parseInt(process.env.BUSINESS_HOURS_START?.split(':')[0] || '9');
    this.startMinute = parseInt(process.env.BUSINESS_HOURS_START?.split(':')[1] || '0');
    this.endHour = parseInt(process.env.BUSINESS_HOURS_END?.split(':')[0] || '19');
    this.endMinute = parseInt(process.env.BUSINESS_HOURS_END?.split(':')[1] || '0');
    
    // Business days (1=Monday, 7=Sunday)
    const daysString = process.env.BUSINESS_DAYS || '1,2,3,4,5';
    this.businessDays = daysString.split(',').map(d => parseInt(d.trim()));
  }

  /**
   * Check if a time is within calling hours
   * @param {Date|string} dateTime - Date/time to check
   * @param {string} timezone - Customer's timezone
   * @returns {boolean} True if within calling hours
   */
  isWithinCallingHours(dateTime, timezone = 'Europe/London') {
    const dt = DateTime.fromJSDate(
      typeof dateTime === 'string' ? new Date(dateTime) : dateTime
    ).setZone(timezone);

    // Check if it's a business day
    if (!this.businessDays.includes(dt.weekday)) {
      return false;
    }

    // Check if within hours
    const startOfDay = dt.set({ hour: this.startHour, minute: this.startMinute, second: 0 });
    const endOfDay = dt.set({ hour: this.endHour, minute: this.endMinute, second: 0 });

    return dt >= startOfDay && dt < endOfDay;
  }

  /**
   * Get the next valid calling time
   * @param {Date|string} fromDateTime - Starting point
   * @param {string} timezone - Customer's timezone
   * @returns {Date} Next valid calling time
   */
  getNextValidCallingTime(fromDateTime, timezone = 'Europe/London') {
    let dt = DateTime.fromJSDate(
      typeof fromDateTime === 'string' ? new Date(fromDateTime) : fromDateTime
    ).setZone(timezone);

    // If current time is within hours, return it
    if (this.isWithinCallingHours(dt.toJSDate(), timezone)) {
      return dt.toJSDate();
    }

    // If before business hours today, return start of today's hours
    const todayStart = dt.set({ hour: this.startHour, minute: this.startMinute, second: 0 });
    if (dt < todayStart && this.businessDays.includes(dt.weekday)) {
      return todayStart.toJSDate();
    }

    // Otherwise, find next business day
    let nextDay = dt.plus({ days: 1 }).set({ hour: this.startHour, minute: this.startMinute, second: 0 });
    
    // Keep advancing until we find a business day
    let maxIterations = 7;
    while (!this.businessDays.includes(nextDay.weekday) && maxIterations > 0) {
      nextDay = nextDay.plus({ days: 1 });
      maxIterations--;
    }

    return nextDay.toJSDate();
  }

  /**
   * Calculate if a delay will land within business hours
   * @param {number} delayMinutes - Delay in minutes
   * @param {string} timezone - Customer's timezone
   * @returns {Object} { withinHours: boolean, adjustedTime: Date }
   */
  calculateDelayWithinHours(delayMinutes, timezone = 'Europe/London') {
    const now = DateTime.now().setZone(timezone);
    const targetTime = now.plus({ minutes: delayMinutes });

    if (this.isWithinCallingHours(targetTime.toJSDate(), timezone)) {
      return {
        withinHours: true,
        adjustedTime: targetTime.toJSDate(),
        originalDelay: delayMinutes,
        adjustedDelay: delayMinutes
      };
    }

    // Find next valid time
    const nextValidTime = this.getNextValidCallingTime(targetTime.toJSDate(), timezone);
    const adjustedDelay = Math.round((new Date(nextValidTime) - now.toJSDate()) / 60000);

    return {
      withinHours: false,
      adjustedTime: nextValidTime,
      originalDelay: delayMinutes,
      adjustedDelay
    };
  }

  /**
   * Get business hours info
   * @returns {Object} Business hours configuration
   */
  getBusinessHoursInfo() {
    const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return {
      start: `${this.startHour.toString().padStart(2, '0')}:${this.startMinute.toString().padStart(2, '0')}`,
      end: `${this.endHour.toString().padStart(2, '0')}:${this.endMinute.toString().padStart(2, '0')}`,
      days: this.businessDays.map(d => dayNames[d])
    };
  }
}

module.exports = new CallingHoursValidator();

