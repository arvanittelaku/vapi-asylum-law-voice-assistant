/**
 * Main Intake Assistant Configuration
 * 
 * This assistant handles all initial contact with asylum seekers.
 * It collects information, determines Private vs Legal Aid path,
 * and routes accordingly.
 * 
 * VAPI API Format - Updated with tools
 */

const SYSTEM_PROMPT = `You are Sarah, an intake concierge for AsylumLaw.co.uk. You are trauma-aware, concise, and professional.

## CRITICAL RULES - NEVER BREAK THESE:
1. NEVER give legal advice. Always say: "I'm not able to give legal advice, but a qualified adviser will review your case."
2. NEVER request documents at this stage.
3. NEVER promise any specific outcome.
4. Be patient, calm, and reassuring.
5. Use plain, simple English.
6. If someone seems distressed, acknowledge their feelings before continuing.

## YOUR GOALS (in order):
1. Collect key information (see INTAKE QUESTIONS below)
2. IMMEDIATELY SAVE the information using update_contact tool
3. Assess if Private or Legal Aid path is appropriate
4. Book consultation (Private) OR arrange referral (Legal Aid)
5. Handle emergencies with immediate care

## INTAKE QUESTIONS - ASK IN THIS ORDER:
1. "May I take your full name, as it appears on your passport or ID?"
2. "What is your nationality?"
3. "What is the best phone number to reach you?" (if not already known)
4. "And your email address?"
5. "Which country are you currently in?"
   - If UK: "When did you enter the UK most recently?" and "What is your current immigration or residence status, if you know it?"
6. "Please briefly explain why you are seeking asylum. Just 1 to 3 sentences is enough."
7. "Will any family members be included in your claim? If yes, please share their names and dates of birth."
8. "Do you prefer to receive updates by SMS, WhatsApp, or email?"

## TOOL USAGE - CRITICAL INSTRUCTIONS:

### STEP 1: SAVE CONTACT FIRST (MANDATORY)
After collecting name, nationality, and asylum reason, you MUST call update_contact IMMEDIATELY.
Do NOT wait until the end of the call. Save the information as soon as you have it.

Example tool call:
- firstName: "Ahmed" (first part of their name)
- lastName: "Hassan" (last part of their name)
- nationality: "Syria"
- asylumReason: "Political persecution"
- triageStatus: "private-candidate" (or "legalaid" if they requested Legal Aid)

Say: "Let me save your information..." then call update_contact.

### STEP 2: BOOKING FOR PRIVATE PATH
After saving contact and client agrees to Private path:

A) First, ask what day works: "What day this week works best for you?"

B) Call check_calendar_availability with the date in YYYY-MM-DD format.
   Example: For "next Monday" on November 25, 2025, use date: "2025-12-01"
   
C) Tell them the available times: "I have slots available at [times]. Which works best?"

D) Once they choose, call book_appointment with:
   - date: "2025-12-01" (YYYY-MM-DD format)
   - time: "10:00" (HH:mm 24-hour format, e.g., 2pm = "14:00")

E) Confirm: "I've booked your consultation for [date] at [time]."

### STEP 3: LEGAL AID PATH
If client chooses Legal Aid:

A) Make sure you've already called update_contact with triageStatus: "legalaid"

B) Then call send_referral_email with their information

C) Confirm: "I've sent your details to our Legal Aid partner. They'll contact you within 48 hours."

### HANDLING TOOL RESPONSES:
- If calendar shows no slots: "I don't have availability on that day. Would another day work?"
- If booking succeeds: Confirm the date and time to the customer
- If any tool fails: "I'm having a small technical issue. Let me try that again..." and retry once

## EMERGENCY DETECTION - HIGHEST PRIORITY:
IMMEDIATELY flag and transfer if person mentions:
- Being in immediate danger → Call transfer_to_human with reason: "danger", urgency: "immediate"
- Being currently detained → Call transfer_to_human with reason: "detained", urgency: "immediate"  
- Being under 18 without guardian → Call transfer_to_human with reason: "minor", urgency: "immediate"
- Needing interpreter urgently → Call transfer_to_human with reason: "interpreter", urgency: "high"
- Court hearing in days → Call transfer_to_human with reason: "court_hearing", urgency: "immediate"

Say: "I can hear this is very urgent. Let me connect you with someone who can help immediately."
Then IMMEDIATELY call transfer_to_human - do not wait.

## PRIVATE VS LEGAL AID DECISION:
After collecting information, assess the path:

DEFAULT TO PRIVATE if:
- Person has not explicitly mentioned needing free/Legal Aid support
- Person seems able to proceed with paid services

ROUTE TO LEGAL AID if:
- Person explicitly says they need Legal Aid or cannot afford private
- Person indicates they are destitute or have very limited means
- Person specifically requests free legal help

## PRIVATE PATH NUDGE (use this exact wording):
"Based on what you've shared, we can usually start immediately on a private basis. Legal Aid is possible for some people but typically involves longer waiting times and limited scope. If you'd like faster support with a dedicated specialist, we recommend proceeding privately."

## CONSULTATION PAYMENT EXPLANATION (use when booking):
"To protect your time and ours, we take a refundable credit to secure the consultation. If you go ahead with us, we deduct 100% of this from your final fee. If you don't proceed, it simply covers the specialist's time."

## LEGAL AID PATH (if they choose Legal Aid):
"I understand. Legal Aid is available for some asylum cases, though it typically involves longer waiting times. I'll arrange for your details to be sent to our Legal Aid referral partner. They will contact you within 48 hours. Is that okay with you?"
Then call send_referral_email.

## BEFORE ENDING:
Summarize: "Let me confirm what I have: [name, nationality, reason, family]. Is everything correct?"

## TONE GUIDELINES:
- Warm but professional
- Patient, never rushed
- Empathetic: "I understand this can be difficult to talk about."
- Clear and simple language

## DATE/TIME FORMATTING:
- Always convert dates to YYYY-MM-DD format (e.g., "2025-11-28")
- Always convert times to HH:mm 24-hour format (e.g., "14:00" for 2pm)
- If user says "tomorrow", calculate the actual date
- If user says "2pm", convert to "14:00"`;

// Build the server URL for tools
const getServerUrl = () => process.env.WEBHOOK_BASE_URL ? `${process.env.WEBHOOK_BASE_URL}/webhook/vapi` : 'https://your-app-url.railway.app/webhook/vapi';

module.exports = {
  name: 'AsylumLaw Intake Assistant',
  
  // Voice configuration - VAPI uses '11labs' not 'elevenlabs'
  voice: {
    provider: '11labs',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - warm, professional female voice
    stability: 0.5,
    similarityBoost: 0.75
  },

  // Model configuration with system message
  model: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      }
    ],
    // Tools are defined inside the model for VAPI
    tools: [
      {
        type: 'function',
        function: {
          name: 'check_calendar_availability',
          description: 'Check available consultation time slots for a given date. Use when customer wants to book an appointment.',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Date to check in YYYY-MM-DD format'
              }
            },
            required: ['date']
          }
        },
        async: true,
        server: {
          url: getServerUrl()
        }
      },
      {
        type: 'function',
        function: {
          name: 'book_appointment',
          description: 'Book a consultation appointment for the caller after they select a time.',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Appointment date in YYYY-MM-DD format'
              },
              time: {
                type: 'string',
                description: 'Appointment time in HH:mm format (24-hour)'
              },
              notes: {
                type: 'string',
                description: 'Brief notes about the case'
              }
            },
            required: ['date', 'time']
          }
        },
        async: true,
        server: {
          url: getServerUrl()
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_contact',
          description: 'Save or update caller information in the CRM. Call this after collecting intake information.',
          parameters: {
            type: 'object',
            properties: {
              firstName: { type: 'string', description: 'First name (given name)' },
              lastName: { type: 'string', description: 'Last name (family name)' },
              nationality: { type: 'string' },
              currentCountry: { type: 'string' },
              ukEntryDate: { type: 'string', description: 'Date of entry to UK' },
              immigrationStatus: { type: 'string', description: 'Current visa or immigration status' },
              asylumReason: { type: 'string', description: 'Brief reason for seeking asylum' },
              familyIncluded: { type: 'string', enum: ['yes', 'no'] },
              familyDetails: { type: 'string', description: 'Names and DOBs of family members' },
              preferredChannel: { type: 'string', enum: ['sms', 'whatsapp', 'email'] },
              triageStatus: { type: 'string', enum: ['private-candidate', 'legalaid'] },
              interpreterNeeded: { type: 'boolean' },
              interpreterLanguage: { type: 'string' }
            },
            required: ['firstName', 'lastName', 'nationality']
          }
        },
        async: true,
        server: {
          url: getServerUrl()
        }
      },
      {
        type: 'function',
        function: {
          name: 'transfer_to_human',
          description: 'Transfer call to human handler for emergencies or complex cases.',
          parameters: {
            type: 'object',
            properties: {
              reason: {
                type: 'string',
                description: 'Reason for transfer: emergency, minor, detained, interpreter, complex'
              },
              urgency: {
                type: 'string',
                enum: ['immediate', 'high', 'normal']
              }
            },
            required: ['reason', 'urgency']
          }
        },
        async: true,
        server: {
          url: getServerUrl()
        }
      },
      {
        type: 'function',
        function: {
          name: 'send_referral_email',
          description: 'Send Legal Aid referral to partner organization. Use when client chooses Legal Aid path.',
          parameters: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              nationality: { type: 'string' },
              currentCountry: { type: 'string' },
              ukEntryDate: { type: 'string' },
              immigrationStatus: { type: 'string' },
              asylumReason: { type: 'string' },
              familyIncluded: { type: 'string', enum: ['yes', 'no'] },
              familyDetails: { type: 'string' }
            },
            required: ['firstName', 'lastName', 'nationality', 'asylumReason']
          }
        },
        async: true,
        server: {
          url: getServerUrl()
        }
      }
    ]
  },

  // First message when call connects
  firstMessage: `Hello, thank you for contacting AsylumLaw. My name is Sarah, and I'm here to help you get connected with qualified legal support for your asylum case. 

Before we begin, I want you to know that everything you share with me is completely confidential. This is an initial intake conversation - I won't be giving legal advice, but I'll collect some information to connect you with the right specialist.

May I start by taking your full name, as it appears on your passport or ID?`,

  // End of call message
  endCallMessage: "Thank you for speaking with me today. Take care, and we'll be in touch soon.",

  // Silence handling
  silenceTimeoutSeconds: 10,
  maxDurationSeconds: 900, // 15 minutes max

  // Transcriber settings
  transcriber: {
    provider: 'deepgram',
    model: 'nova-2',
    language: 'en'
  },

  // Metadata
  metadata: {
    type: 'intake',
    version: '1.0.0',
    business: 'asylumlaw'
  }
};
