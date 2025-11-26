# AsylumLaw Voice Assistant - Deployment Guide

## Prerequisites Completed ✅
- [x] All code implemented and tested locally
- [x] VAPI assistants deployed (Intake, Emergency, Confirmation)
- [x] GHL workflows created (7 workflows)
- [x] GHL custom fields configured
- [x] Phone number assigned in VAPI
- [x] Twilio SMS connected
- [x] All 30 tool tests passing
- [x] All 5 flow tests passing

---

## Deployment Steps (Needs Boss)

### Step 1: Deploy Server
Choose a hosting platform:
- **Railway** (recommended): https://railway.app
- **Render**: https://render.com  
- **Heroku**: https://heroku.com

```bash
# Railway deployment
railway login
railway init
railway up
```

### Step 2: Get Production URL
After deployment, note your production URL:
```
https://your-app-name.railway.app
```

### Step 3: Update Environment Variables
Update `.env` with production URL:
```env
WEBHOOK_BASE_URL=https://your-app-name.railway.app
```

Also set these on your hosting platform.

### Step 4: Redeploy VAPI Assistants
```bash
npm run deploy:all
```

This updates all 3 assistants with the new webhook URL.

### Step 5: Verify Deployment
```bash
npm run prelaunch
```

All checks should pass ✅

### Step 6: Test Live Call
1. Call the VAPI phone number
2. Test the intake flow
3. Verify appointment appears in GHL
4. Check custom fields are populated

---

## Quick Verification Checklist

### Server Health
```bash
curl https://your-app-name.railway.app/health
# Should return: {"status":"ok",...}
```

### VAPI Webhook
```bash
curl -X POST https://your-app-name.railway.app/webhook/vapi \
  -H "Content-Type: application/json" \
  -d '{"message":{"type":"status-update"}}'
# Should return: {"received":true}
```

### GHL Connection
```bash
curl https://your-app-name.railway.app/status
# Should show GHL connection status
```

---

## Test Scenarios

### 1. New Intake (Private Path)
- [ ] Call answers, Sarah greets
- [ ] Collects name, nationality, reason
- [ ] Offers private consultation
- [ ] Checks calendar availability
- [ ] Books appointment
- [ ] Contact created in GHL with correct fields

### 2. Legal Aid Referral
- [ ] Client requests Legal Aid
- [ ] Referral email sent (check logs)
- [ ] Contact tagged with 'legalaid'
- [ ] Task created in GHL

### 3. Emergency Handling
- [ ] Say "I'm in danger" - triggers transfer
- [ ] Emergency task created
- [ ] Contact flagged as emergency
- [ ] Call transferred to duty phone

### 4. Appointment Confirmation
- [ ] Confirmation call connects
- [ ] Client confirms → status updated
- [ ] Client reschedules → new appointment booked
- [ ] Client cancels → appointment cancelled

---

## Troubleshooting

### Tools Not Working
1. Check server logs: `railway logs`
2. Verify WEBHOOK_BASE_URL is correct
3. Redeploy assistants: `npm run deploy:all`

### GHL Not Updating
1. Check GHL API key permissions
2. Verify custom field IDs in .env
3. Check server logs for API errors

### Calls Not Connecting
1. Verify VAPI phone number is active
2. Check assistant has phone assigned
3. Verify GHL workflow is triggering correctly

---

## Environment Variables Required

```env
# VAPI (Required)
VAPI_API_KEY=your-vapi-key
VAPI_INTAKE_ASSISTANT_ID=xxx
VAPI_EMERGENCY_ASSISTANT_ID=xxx
VAPI_CONFIRMATION_ASSISTANT_ID=xxx
VAPI_OUTBOUND_PHONE_ID=64130a12-9a9c-44d9-9eb7-cc7cbd3be575

# GHL (Required)
GHL_API_KEY=your-ghl-key
GHL_LOCATION_ID=your-location-id
GHL_CALENDAR_ID=your-calendar-id

# Webhook (Required)
WEBHOOK_BASE_URL=https://your-production-url.railway.app

# Twilio (Required for SMS)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

# Team (Required)
EMERGENCY_DUTY_PHONE=+44xxx
TEAM_NOTIFICATION_EMAIL=team@asylumlaw.co.uk
LEGAL_AID_PARTNER_EMAIL=partner@example.com

# Optional
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASS=xxx
FROM_EMAIL=noreply@asylumlaw.co.uk
```

---

## Post-Deployment Monitoring

### Check Server Status
```
GET /health - Server health
GET /status - Service status  
GET /metrics - Request metrics
```

### Check Logs
```bash
railway logs --follow
```

### GHL Activity
Monitor in GHL dashboard:
- New contacts created
- Appointments booked
- Tasks created
- Workflow triggers

---

## Support Contacts

- VAPI Support: support@vapi.ai
- GHL Support: In-app chat
- Twilio Support: https://www.twilio.com/help/contact

---

*Last Updated: November 26, 2025*

