# GoHighLevel Setup Guide

## Custom Fields

Create these custom fields in GHL (Settings → Custom Fields):

### Contact Information Fields

| Field Name | Key | Type | Options |
|------------|-----|------|---------|
| Nationality | `nationality` | Text | - |
| Current Country | `current_country` | Text | - |
| UK Entry Date | `uk_entry_date` | Date | - |
| Immigration Status | `immigration_status` | Text | - |
| Asylum Reason | `asylum_reason` | Large Text | - |
| Family Included | `family_included` | Dropdown | yes, no |
| Family Details | `family_details` | Large Text | - |
| Preferred Channel | `preferred_channel` | Dropdown | sms, whatsapp, email |

### Triage Fields

| Field Name | Key | Type | Options |
|------------|-----|------|---------|
| Triage Status | `triage_status` | Dropdown | private-candidate, legalaid |

### Call Tracking Fields

| Field Name | Key | Type | Options |
|------------|-----|------|---------|
| Call Attempts | `call_attempts` | Number | - |
| Last Call Time | `last_call_time` | Date/Time | - |
| Next Call Scheduled | `next_call_scheduled` | Date/Time | - |
| Ended Reason | `ended_reason` | Text | - |
| Timezone | `timezone` | Text | - |

### Confirmation Fields

| Field Name | Key | Type | Options |
|------------|-----|------|---------|
| Confirmation Status | `confirmation_status` | Dropdown | confirmed, cancelled, reschedule, no_answer |

### Emergency Fields

| Field Name | Key | Type | Options |
|------------|-----|------|---------|
| Emergency Flag | `emergency_flag` | Checkbox | - |
| Emergency Type | `emergency_type` | Text | - |
| Interpreter Needed | `interpreter_needed` | Text | - |

---

## Pipeline Setup

Create a pipeline called "Asylum Inquiries" with these stages:

1. **New Inquiry** - Default stage
2. **Contacted** - After first call
3. **Private - Booking Pending** - Awaiting consultation booking
4. **Private - Booked** - Consultation scheduled
5. **Private - Completed** - Consultation done
6. **Legal Aid - Referred** - Sent to partner
7. **Unreachable** - After 3 failed calls

---

## Calendar Setup

1. Create a calendar called "Asylum Consultations"
2. Set availability (e.g., Mon-Fri, 9 AM - 5 PM)
3. Set appointment duration (30 minutes recommended)
4. Copy the Calendar ID for your `.env`

---

## Tags

Create these tags for organization:

- `asylum-intake`
- `private-candidate`
- `legalaid`
- `family-included`
- `in-uk`
- `out-uk`
- `emergency`
- `priority-review`
- `unreachable`
- `referred`

---

## Workflows

Import or create these workflows (templates in `/workflows/`):

1. **Initial Contact Call** - Trigger: Contact Created with tag `asylum-intake`
2. **Confirmation Call** - Trigger: Appointment Created
3. **Private Candidate** - Trigger: `triage_status` = `private-candidate`
4. **Legal Aid Referral** - Trigger: `triage_status` = `legalaid`
5. **Confirmed Status** - Trigger: `confirmation_status` = `confirmed`
6. **No Answer Fallback** - Trigger: `call_attempts` = `3`
7. **Emergency Alert** - Trigger: `emergency_flag` = `true`

---

## API Key

1. Go to Settings → Integrations → API Keys
2. Create new API key with these permissions:
   - Contacts (Read/Write)
   - Calendars (Read/Write)
   - Opportunities (Read/Write)
   - Custom Fields (Read/Write)
3. Copy the API key to your `.env`

---

## Location ID

1. Go to Settings → Business Info
2. Find your Location ID in the URL or settings
3. Copy to `.env` as `GHL_LOCATION_ID`

