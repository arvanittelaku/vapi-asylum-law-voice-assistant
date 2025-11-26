# 🚀 Quick Start Guide - AsylumLaw Voice Assistant

## Prerequisites

Before starting, ensure you have:
- [ ] Node.js 18+ installed
- [ ] VAPI account with API key
- [ ] GoHighLevel account with API key
- [ ] Twilio account (for SMS)
- [ ] A Twilio phone number

---

## Step 1: Install Dependencies

```bash
cd vapi-asylum-law-voice-assistant
npm install
```

---

## Step 2: Configure Environment

```bash
cp env.template .env
```

Edit `.env` with your credentials:

```env
# Required
VAPI_API_KEY=your_vapi_api_key
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_location_id
GHL_CALENDAR_ID=your_calendar_id
WEBHOOK_BASE_URL=https://your-deployed-url.com

# Optional (for SMS)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+44xxxxxxxxxx
```

---

## Step 3: Create GHL Custom Fields

In GoHighLevel, create these custom fields:

| Field Name | Field Key | Type |
|------------|-----------|------|
| Nationality | `nationality` | Text |
| Current Country | `current_country` | Text |
| UK Entry Date | `uk_entry_date` | Date |
| Immigration Status | `immigration_status` | Text |
| Asylum Reason | `asylum_reason` | Text Area |
| Family Included | `family_included` | Dropdown (yes/no) |
| Family Details | `family_details` | Text Area |
| Triage Status | `triage_status` | Dropdown (private-candidate/legalaid) |
| Preferred Channel | `preferred_channel` | Dropdown (sms/whatsapp/email) |
| Call Attempts | `call_attempts` | Number |
| Confirmation Status | `confirmation_status` | Dropdown |
| Emergency Flag | `emergency_flag` | Checkbox |
| Interpreter Needed | `interpreter_needed` | Text |

Add the field IDs to your `.env` file.

---

## Step 4: Deploy Assistants

```bash
# Deploy all assistants to VAPI
npm run deploy:all
```

This will output assistant IDs. Add them to your `.env`:

```env
VAPI_INTAKE_ASSISTANT_ID=xxx
VAPI_EMERGENCY_ASSISTANT_ID=xxx
VAPI_CONFIRMATION_ASSISTANT_ID=xxx
```

---

## Step 5: Deploy Server

### Option A: Railway (Recommended)

1. Connect GitHub repo to Railway
2. Set environment variables in Railway
3. Deploy

### Option B: Local (Development)

```bash
npm run dev
```

---

## Step 6: Configure Phone Numbers

In VAPI Dashboard:
1. Import your Twilio phone number
2. Assign the Intake Assistant to handle inbound calls
3. Note the phone number IDs

Add to `.env`:

```env
VAPI_INBOUND_PHONE_ID=xxx
VAPI_OUTBOUND_PHONE_ID=xxx
VAPI_CONFIRMATION_PHONE_ID=xxx
```

---

## Step 7: Create GHL Workflows

Import or manually create the workflows from `/workflows/` folder:

1. **Initial Call** - Triggers outbound call on new contact
2. **Confirmation Call** - Calls 1 hour before appointment
3. **Private Candidate** - Sends booking link
4. **Legal Aid Referral** - Sends referral to partner
5. **Confirmed Status** - Thank you message
6. **No Answer** - SMS fallback after 3 attempts
7. **Emergency Alert** - Immediate team notification

---

## Step 8: Verify Deployment

```bash
npm run verify
```

All checks should pass ✅

---

## Step 9: Test

1. **Test inbound call**: Call your phone number
2. **Test outbound call**: Create a contact in GHL with your phone
3. **Test tools**: Verify calendar checking and booking works
4. **Test SMS**: Verify fallback messages send

---

## 🎉 You're Live!

Monitor your first 10 calls, review transcripts, and optimize prompts as needed.

### Support

- Check logs in Railway/deployment platform
- Review call transcripts in VAPI dashboard
- See contact updates in GHL

### Common Issues

| Issue | Solution |
|-------|----------|
| Calls not initiating | Check VAPI API key and phone number assignment |
| Tools not working | Verify WEBHOOK_BASE_URL is correct |
| SMS not sending | Check Twilio credentials |
| Calendar not showing slots | Verify GHL Calendar ID |

