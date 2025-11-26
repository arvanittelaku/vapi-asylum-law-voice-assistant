/**
 * Timezone Detector
 * 
 * Detects timezone from phone number country code.
 * Used for scheduling calls during appropriate business hours.
 */

// Mapping of country codes to timezones
// Comprehensive list covering common asylum-seeker source countries
const TIMEZONE_MAP = {
  // ============================================
  // EUROPE
  // ============================================
  '+44': 'Europe/London',      // United Kingdom
  '+353': 'Europe/Dublin',     // Ireland
  '+33': 'Europe/Paris',       // France
  '+49': 'Europe/Berlin',      // Germany
  '+34': 'Europe/Madrid',      // Spain
  '+39': 'Europe/Rome',        // Italy
  '+31': 'Europe/Amsterdam',   // Netherlands
  '+32': 'Europe/Brussels',    // Belgium
  '+41': 'Europe/Zurich',      // Switzerland
  '+43': 'Europe/Vienna',      // Austria
  '+48': 'Europe/Warsaw',      // Poland
  '+46': 'Europe/Stockholm',   // Sweden
  '+47': 'Europe/Oslo',        // Norway
  '+45': 'Europe/Copenhagen',  // Denmark
  '+358': 'Europe/Helsinki',   // Finland
  '+30': 'Europe/Athens',      // Greece
  '+90': 'Europe/Istanbul',    // Turkey
  '+355': 'Europe/Tirane',     // Albania
  '+381': 'Europe/Belgrade',   // Serbia
  '+385': 'Europe/Zagreb',     // Croatia
  '+380': 'Europe/Kiev',       // Ukraine
  '+375': 'Europe/Minsk',      // Belarus
  '+40': 'Europe/Bucharest',   // Romania
  '+359': 'Europe/Sofia',      // Bulgaria
  '+36': 'Europe/Budapest',    // Hungary
  '+420': 'Europe/Prague',     // Czech Republic
  '+421': 'Europe/Bratislava', // Slovakia
  '+386': 'Europe/Ljubljana',  // Slovenia
  '+382': 'Europe/Podgorica',  // Montenegro
  '+389': 'Europe/Skopje',     // North Macedonia
  '+387': 'Europe/Sarajevo',   // Bosnia
  '+383': 'Europe/Pristina',   // Kosovo
  '+373': 'Europe/Chisinau',   // Moldova
  '+370': 'Europe/Vilnius',    // Lithuania
  '+371': 'Europe/Riga',       // Latvia
  '+372': 'Europe/Tallinn',    // Estonia
  
  // ============================================
  // MIDDLE EAST (Common asylum sources)
  // ============================================
  '+93': 'Asia/Kabul',         // Afghanistan
  '+963': 'Asia/Damascus',     // Syria
  '+964': 'Asia/Baghdad',      // Iraq
  '+98': 'Asia/Tehran',        // Iran
  '+967': 'Asia/Aden',         // Yemen
  '+970': 'Asia/Gaza',         // Palestine
  '+962': 'Asia/Amman',        // Jordan
  '+961': 'Asia/Beirut',       // Lebanon
  '+972': 'Asia/Jerusalem',    // Israel
  '+966': 'Asia/Riyadh',       // Saudi Arabia
  '+971': 'Asia/Dubai',        // UAE
  '+974': 'Asia/Qatar',        // Qatar
  '+973': 'Asia/Bahrain',      // Bahrain
  '+965': 'Asia/Kuwait',       // Kuwait
  '+968': 'Asia/Muscat',       // Oman
  
  // ============================================
  // SOUTH/CENTRAL ASIA
  // ============================================
  '+92': 'Asia/Karachi',       // Pakistan
  '+91': 'Asia/Kolkata',       // India
  '+880': 'Asia/Dhaka',        // Bangladesh
  '+94': 'Asia/Colombo',       // Sri Lanka
  '+95': 'Asia/Yangon',        // Myanmar (Burma)
  '+977': 'Asia/Kathmandu',    // Nepal
  '+975': 'Asia/Thimphu',      // Bhutan
  '+93': 'Asia/Kabul',         // Afghanistan
  '+992': 'Asia/Dushanbe',     // Tajikistan
  '+998': 'Asia/Tashkent',     // Uzbekistan
  '+996': 'Asia/Bishkek',      // Kyrgyzstan
  '+993': 'Asia/Ashgabat',     // Turkmenistan
  '+7': 'Asia/Almaty',         // Kazakhstan (also Russia)
  
  // ============================================
  // EAST ASIA
  // ============================================
  '+86': 'Asia/Shanghai',      // China
  '+852': 'Asia/Hong_Kong',    // Hong Kong
  '+853': 'Asia/Macau',        // Macau
  '+84': 'Asia/Ho_Chi_Minh',   // Vietnam
  '+66': 'Asia/Bangkok',       // Thailand
  '+855': 'Asia/Phnom_Penh',   // Cambodia
  '+856': 'Asia/Vientiane',    // Laos
  '+60': 'Asia/Kuala_Lumpur',  // Malaysia
  '+65': 'Asia/Singapore',     // Singapore
  '+62': 'Asia/Jakarta',       // Indonesia
  '+63': 'Asia/Manila',        // Philippines
  '+82': 'Asia/Seoul',         // South Korea
  '+850': 'Asia/Pyongyang',    // North Korea
  '+81': 'Asia/Tokyo',         // Japan
  '+886': 'Asia/Taipei',       // Taiwan
  
  // ============================================
  // AFRICA (Common asylum sources)
  // ============================================
  '+249': 'Africa/Khartoum',   // Sudan
  '+211': 'Africa/Juba',       // South Sudan
  '+252': 'Africa/Mogadishu',  // Somalia
  '+291': 'Africa/Asmara',     // Eritrea
  '+251': 'Africa/Addis_Ababa', // Ethiopia
  '+234': 'Africa/Lagos',      // Nigeria
  '+233': 'Africa/Accra',      // Ghana
  '+225': 'Africa/Abidjan',    // Ivory Coast
  '+221': 'Africa/Dakar',      // Senegal
  '+220': 'Africa/Banjul',     // Gambia
  '+224': 'Africa/Conakry',    // Guinea
  '+232': 'Africa/Freetown',   // Sierra Leone
  '+231': 'Africa/Monrovia',   // Liberia
  '+237': 'Africa/Douala',     // Cameroon
  '+243': 'Africa/Kinshasa',   // DRC (Democratic Republic of Congo)
  '+242': 'Africa/Brazzaville', // Congo
  '+256': 'Africa/Kampala',    // Uganda
  '+250': 'Africa/Kigali',     // Rwanda
  '+257': 'Africa/Bujumbura',  // Burundi
  '+254': 'Africa/Nairobi',    // Kenya
  '+255': 'Africa/Dar_es_Salaam', // Tanzania
  '+263': 'Africa/Harare',     // Zimbabwe
  '+27': 'Africa/Johannesburg', // South Africa
  '+20': 'Africa/Cairo',       // Egypt
  '+218': 'Africa/Tripoli',    // Libya
  '+216': 'Africa/Tunis',      // Tunisia
  '+213': 'Africa/Algiers',    // Algeria
  '+212': 'Africa/Casablanca', // Morocco
  
  // ============================================
  // AMERICAS
  // ============================================
  '+1': 'America/New_York',    // USA/Canada (default Eastern)
  '+52': 'America/Mexico_City', // Mexico
  '+55': 'America/Sao_Paulo',  // Brazil
  '+54': 'America/Buenos_Aires', // Argentina
  '+56': 'America/Santiago',   // Chile
  '+57': 'America/Bogota',     // Colombia
  '+51': 'America/Lima',       // Peru
  '+58': 'America/Caracas',    // Venezuela
  '+593': 'America/Guayaquil', // Ecuador
  '+591': 'America/La_Paz',    // Bolivia
  '+595': 'America/Asuncion',  // Paraguay
  '+598': 'America/Montevideo', // Uruguay
  '+53': 'America/Havana',     // Cuba
  '+509': 'America/Port-au-Prince', // Haiti
  '+1809': 'America/Santo_Domingo', // Dominican Republic
  '+502': 'America/Guatemala', // Guatemala
  '+503': 'America/El_Salvador', // El Salvador
  '+504': 'America/Tegucigalpa', // Honduras
  '+505': 'America/Managua',   // Nicaragua
  '+507': 'America/Panama',    // Panama
  '+506': 'America/Costa_Rica', // Costa Rica
  
  // ============================================
  // OCEANIA
  // ============================================
  '+61': 'Australia/Sydney',   // Australia
  '+64': 'Pacific/Auckland',   // New Zealand
  '+679': 'Pacific/Fiji'       // Fiji
};

class TimezoneDetector {
  /**
   * Detect timezone from phone number
   * @param {string} phoneNumber - Phone number with country code
   * @returns {string} Timezone identifier
   */
  detectTimezone(phoneNumber) {
    if (!phoneNumber) {
      console.log('[TimezoneDetector] No phone number provided, using default');
      return process.env.DEFAULT_TIMEZONE || 'Europe/London';
    }

    // Clean the phone number
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Try to match country codes (longest first)
    const sortedCodes = Object.keys(TIMEZONE_MAP).sort((a, b) => b.length - a.length);
    
    for (const code of sortedCodes) {
      if (cleaned.startsWith(code)) {
        const timezone = TIMEZONE_MAP[code];
        console.log(`[TimezoneDetector] Detected ${timezone} from ${code}`);
        return timezone;
      }
    }

    // Default timezone if no match
    console.log(`[TimezoneDetector] No match for ${phoneNumber}, using default`);
    return process.env.DEFAULT_TIMEZONE || 'Europe/London';
  }

  /**
   * Get country code from phone number
   * @param {string} phoneNumber - Phone number
   * @returns {string|null} Country code or null
   */
  getCountryCode(phoneNumber) {
    if (!phoneNumber) return null;
    
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const sortedCodes = Object.keys(TIMEZONE_MAP).sort((a, b) => b.length - a.length);
    
    for (const code of sortedCodes) {
      if (cleaned.startsWith(code)) {
        return code;
      }
    }
    return null;
  }

  /**
   * Check if phone number is from UK
   * @param {string} phoneNumber - Phone number
   * @returns {boolean} True if UK number
   */
  isUKNumber(phoneNumber) {
    const code = this.getCountryCode(phoneNumber);
    return code === '+44';
  }

  /**
   * Get all supported country codes
   * @returns {Array<string>} List of country codes
   */
  getSupportedCountryCodes() {
    return Object.keys(TIMEZONE_MAP);
  }

  /**
   * Add or update a timezone mapping
   * @param {string} countryCode - Country code (e.g., '+44')
   * @param {string} timezone - Timezone identifier
   */
  addMapping(countryCode, timezone) {
    TIMEZONE_MAP[countryCode] = timezone;
    console.log(`[TimezoneDetector] Added mapping: ${countryCode} -> ${timezone}`);
  }
}

module.exports = new TimezoneDetector();

