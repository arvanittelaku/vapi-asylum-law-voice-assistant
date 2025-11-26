# AsylumLaw Voice Assistant

AI-powered voice assistant for **AsylumLaw.co.uk** - Asylum intake, triage, and consultation booking system.

## 🎯 What This Does

- **Collects** asylum seeker information via voice calls
- **Triages** cases to Private (paid) or Legal Aid (free) paths
- **Books** consultations and handles payments
- **Confirms** appointments 1 hour before
- **Retries** intelligently if calls aren't answered
- **Refers** Legal Aid cases to partner organizations

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  CONTACT SOURCES                     │
│   Phone Call | Web Form | SMS | WhatsApp | Email    │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              VAPI VOICE ASSISTANT                    │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   INTAKE    │  │  EMERGENCY  │  │ CONFIRMATION│ │
│  │  ASSISTANT  │  │   HANDLER   │  │  ASSISTANT  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────┬───────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   PRIVATE   │   │  LEGAL AID  │   │  EMERGENCY  │
│    PATH     │   │    PATH     │   │   HANDOFF   │
│             │   │             │   │             │
│ Book + Pay  │   │  Referral   │   │   Human     │
│ Consultation│   │  to Partner │   │   Transfer  │
└─────────────┘   └─────────────┘   └─────────────┘
```

## 📁 Project Structure

```
asylumlaw-voice-assistant/
├── src/
│   ├── config/
│   │   ├── intake-assistant.js       # Main intake assistant config
│   │   ├── emergency-assistant.js    # Emergency handler config
│   │   └── confirmation-assistant.js # Confirmation assistant config
│   │
│   ├── services/
│   │   ├── vapi-client.js           # VAPI API client
│   │   ├── ghl-client.js            # GoHighLevel API client
│   │   ├── sms-client.js            # Twilio SMS client
│   │   ├── stripe-client.js         # Stripe payments client
│   │   ├── timezone-detector.js     # Phone → timezone detection
│   │   ├── calling-hours-validator.js # Business hours validation
│   │   └── smart-retry-calculator.js  # Retry delay calculation
│   │
│   └── webhooks/
│       ├── vapi-function-handler.js    # VAPI tool calls
│       ├── ghl-trigger-handler.js      # GHL → VAPI triggers
│       ├── ghl-confirmation-handler.js # Confirmation call trigger
│       └── end-of-call-handler.js      # Smart retry logic
│
├── scripts/
│   ├── deploy-intake-assistant.js
│   ├── deploy-emergency-assistant.js
│   ├── deploy-confirmation-assistant.js
│   ├── configure-phone-numbers.js
│   └── verify-deployment.js
│
├── tools/                              # VAPI tool JSON definitions
├── workflows/                          # GHL workflow templates
├── knowledge-base/                     # AI knowledge files
├── docs/                               # Documentation
│
├── server.js                           # Main Express server
├── package.json
├── env.template                        # Environment variables template
└── README.md
```

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/arvanittelaku/vapi-asylum-law-voice-assistant.git
cd vapi-asylum-law-voice-assistant
npm install
```

### 2. Configure Environment

```bash
cp env.template .env
# Edit .env with your credentials
```

### 3. Deploy Assistants

```bash
npm run deploy:all
npm run configure:phones
npm run verify
```

### 4. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

## 📞 Assistants

### 1. Intake Assistant
- Collects asylum seeker information
- Determines Private vs Legal Aid path
- Books consultations (Private) or refers (Legal Aid)
- Trauma-aware, professional, never gives legal advice

### 2. Emergency Handler
- Handles immediate danger situations
- Supports unaccompanied minors
- Manages detained persons
- Provides crisis resources
- Transfers to human immediately

### 3. Confirmation Assistant
- Calls 1 hour before appointments
- Confirms, reschedules, or cancels
- Updates status in GHL
- Triggers appropriate follow-up workflows

## 🔧 Tools

| Tool | Purpose |
|------|---------|
| `check_calendar_availability` | Check available consultation slots |
| `book_appointment` | Book consultation in GHL calendar |
| `cancel_appointment` | Cancel existing appointment |
| `update_contact` | Update GHL contact with intake data |
| `create_payment_link` | Generate Stripe payment link |
| `send_referral_email` | Send Legal Aid referral to partner |
| `transfer_to_human` | Transfer call to human handler |

## 📊 GHL Custom Fields

| Field | Purpose |
|-------|---------|
| `triage_status` | private-candidate / legalaid |
| `nationality` | Country of origin |
| `asylum_reason` | Brief reason for seeking asylum |
| `family_included` | Yes/No |
| `confirmation_status` | confirmed/cancelled/reschedule/no_answer |
| `call_attempts` | Retry tracking (max 3) |
| `emergency_flag` | Danger/detained/minor flag |

## 🔄 Workflows

1. **Form Submit → AI Intake** - Starts intake conversation
2. **Private Candidate → Booking** - Sends booking + payment link
3. **Legal Aid → Referral** - Sends referral to partner
4. **Confirmation (1h before)** - Confirmation call
5. **No Answer (3 attempts)** - SMS fallback + team alert
6. **Emergency Alert** - Immediate human notification

## 📝 License

ISC

## 🆘 Support

- Email: help@asylumlaw.co.uk
- Phone: 020 3006 9533

