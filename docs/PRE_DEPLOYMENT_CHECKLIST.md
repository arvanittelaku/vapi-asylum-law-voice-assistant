# Pre-Deployment Verification Checklist

## 🔍 Code Logic Verification

### 1. Function Handler Mapping ✅
| Function Name | Handler Method | Status |
|--------------|----------------|--------|
| `check_calendar_availability` | `checkCalendarAvailability()` | ✅ Mapped |
| `book_appointment` | `bookAppointment()` | ✅ Mapped |
| `cancel_appointment` | `cancelAppointment()` | ✅ Mapped |
| `update_contact` | `updateContact()` | ✅ Mapped |
| `update_confirmation_status` | `updateConfirmationStatus()` | ✅ Mapped |
| `transfer_to_human` | `transferToHuman()` | ✅ Mapped |
| `create_urgent_task` | `createUrgentTask()` | ✅ Mapped |
| `send_referral_email` | `sendReferralEmail()` | ✅ Mapped |

### 2. VAPI Payload Parsing ✅
```javascript
// Expected VAPI payload structure:
{
  "message": {
    "type": "function-call",
    "functionCall": {
      "name": "function_name",
      "parameters": { ... }
    }
  },
  "call": {
    "metadata": {
      "contact_id": "...",
      "customerPhone": "..."
    }
  }
}
```
**Code handles this:** Lines 18-28 in vapi-function-handler.js ✅

### 3. Error Handling ✅
- Try-catch wraps all function calls (lines 32-68) ✅
- Returns `{ error, success: false }` on failure ✅
- Graceful fallbacks for missing data ✅

---

## 🔗 Integration Points Verification

### 4. GHL Custom Field Mapping
| Field Name | Environment Variable | Status |
|------------|---------------------|--------|
| nationality | `GHL_FIELD_NATIONALITY` | ⚠️ Verify in .env |
| currentCountry | `GHL_FIELD_CURRENT_COUNTRY` | ⚠️ Verify in .env |
| ukEntryDate | `GHL_FIELD_UK_ENTRY_DATE` | ⚠️ Verify in .env |
| asylumReason | `GHL_FIELD_ASYLUM_REASON` | ⚠️ Verify in .env |
| familyIncluded | `GHL_FIELD_FAMILY_INCLUDED` | ⚠️ Verify in .env |
| familyDetails | `GHL_FIELD_FAMILY_DETAILS` | ⚠️ Verify in .env |
| triageStatus | `GHL_FIELD_TRIAGE_STATUS` | ⚠️ Verify in .env |
| preferredChannel | `GHL_FIELD_PREFERRED_CHANNEL` | ⚠️ Verify in .env |
| fullName | `GHL_FIELD_FULL_NAME` | ⚠️ Verify in .env |
| immigrationStatus | `GHL_FIELD_IMMIGRATION_STATUS` | ⚠️ Verify in .env |
| callAttempts | `GHL_FIELD_CALL_ATTEMPTS` | ⚠️ Verify in .env |
| confirmationStatus | `GHL_FIELD_CONFIRMATION_STATUS` | ⚠️ Verify in .env |
| emergencyFlag | `GHL_FIELD_EMERGENCY_FLAG` | ⚠️ Verify in .env |
| emergencyType | `GHL_FIELD_EMERGENCY_TYPE` | ⚠️ Verify in .env |
| interpreterNeeded | `GHL_FIELD_INTERPRETER_NEEDED` | ⚠️ Verify in .env |
| interpreterLanguage | `GHL_FIELD_INTERPRETER_LANGUAGE` | ⚠️ Verify in .env |

### 5. VAPI Assistant Configuration
| Assistant | Tools Count | Webhook URL Status |
|-----------|-------------|-------------------|
| Intake | 5 | ❌ Placeholder URL |
| Emergency | 3 | ❌ Placeholder URL |
| Confirmation | 4 | ❌ Placeholder URL |

**Action Required:** After deployment, run `npm run deploy:all` with updated `WEBHOOK_BASE_URL`

---

## 📝 Prompt Verification

### 6. Intake Assistant Prompts
- [x] Trauma-aware tone defined
- [x] 8 intake questions in order
- [x] Private vs Legal Aid decision logic
- [x] Nudge copy for Private path
- [x] Legal Aid path explanation
- [x] Emergency detection keywords
- [x] Summary before ending
- [x] Tools documented in prompt

### 7. Emergency Detection Keywords
The AI should flag these:
- "immediate danger" ✅
- "detained" ✅
- "unaccompanied minor" / "under 18" ✅
- "interpreter" ✅
- "court hearing" + "soon" ✅

### 8. Confirmation Assistant Prompts
- [x] Confirm/Reschedule/Cancel options
- [x] Reschedule flow with calendar check
- [x] Status update tool usage

---

## 🧪 Test Scenarios

### Scenario 1: Normal Private Flow
```
1. User calls
2. AI greets, asks name
3. AI asks nationality, phone, email, country
4. AI asks asylum reason, family
5. AI gives Private nudge
6. User agrees to Private
7. AI checks calendar → shows slots
8. User picks slot
9. AI books appointment
10. AI confirms and ends
```
**Functions used:** `update_contact`, `check_calendar_availability`, `book_appointment`

### Scenario 2: Legal Aid Flow
```
1. User calls
2. AI collects info
3. User says "I can't afford private"
4. AI offers Legal Aid option
5. User confirms Legal Aid
6. AI sends referral email
7. AI confirms referral sent
```
**Functions used:** `update_contact`, `send_referral_email`

### Scenario 3: Emergency Flow
```
1. User calls
2. User says "I'm being detained"
3. AI immediately offers transfer
4. AI creates urgent task
5. AI transfers call
```
**Functions used:** `transfer_to_human`, `create_urgent_task`

### Scenario 4: Confirmation Call - Confirm
```
1. AI calls to confirm
2. User says "Yes, confirmed"
3. AI updates status to "confirmed"
4. AI thanks and ends
```
**Functions used:** `update_confirmation_status`

### Scenario 5: Confirmation Call - Reschedule
```
1. AI calls to confirm
2. User wants to reschedule
3. AI checks available slots
4. User picks new slot
5. AI cancels old appointment
6. AI books new appointment
7. AI confirms new time
```
**Functions used:** `check_calendar_availability`, `cancel_appointment`, `book_appointment`, `update_confirmation_status`

---

## 🔧 Configuration Checklist

### Environment Variables Required
```
# VAPI
VAPI_API_KEY=                    ⚠️ Required
VAPI_INTAKE_ASSISTANT_ID=        ✅ Set
VAPI_EMERGENCY_ASSISTANT_ID=     ✅ Set
VAPI_CONFIRMATION_ASSISTANT_ID=  ✅ Set

# GHL
GHL_API_KEY=                     ✅ Set
GHL_LOCATION_ID=                 ⚠️ Verify
GHL_CALENDAR_ID=                 ✅ Set

# Custom Fields (16 fields)       ⚠️ Verify all IDs

# Twilio
TWILIO_ACCOUNT_SID=              ⚠️ Required for SMS
TWILIO_AUTH_TOKEN=               ⚠️ Required for SMS
TWILIO_PHONE_NUMBER=             ⚠️ Required for SMS

# Business
WEBHOOK_BASE_URL=                ❌ Needs production URL
EMERGENCY_DUTY_PHONE=            ⚠️ Required
LEGAL_AID_PARTNER_EMAIL=         ⚠️ Required
```

---

## 🚀 Deployment Steps

### Step 1: Deploy Server
```bash
# Push to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# Deploy to Railway/Render
# Get public URL: https://your-app.railway.app
```

### Step 2: Update Environment
```bash
# Update .env with real WEBHOOK_BASE_URL
WEBHOOK_BASE_URL=https://your-app.railway.app
```

### Step 3: Redeploy Assistants
```bash
npm run deploy:all
```
This updates all assistant webhook URLs.

### Step 4: Configure VAPI Phone Number
1. Buy/import number in VAPI Dashboard
2. Assign to Intake Assistant

### Step 5: Test Live Call
1. Call the VAPI number
2. Run through each scenario
3. Verify GHL data created
4. Verify emails sent

---

## ⚠️ Known Issues & Risks

1. **Calendar API**: GHL free-slots API returns empty - may need VAPI's native GHL integration
2. **Webhook URL**: Currently placeholder - MUST update after deployment
3. **Email**: Using console logging - needs real email service for production
4. **Transfer**: VAPI handles actual transfer, our code just returns instruction

---

## ✅ Sign-Off

| Verification | Checked By | Date |
|-------------|------------|------|
| Code Logic | | |
| GHL Fields | | |
| Prompts | | |
| Error Handling | | |
| Deployment | | |
| Live Test | | |

