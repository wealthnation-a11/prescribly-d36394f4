

# Doctor-Approved Drug Prescriptions + Home Service Booking

## Overview
Two major features:
1. **Drug recommendations require doctor approval** before being shown to patients after AI diagnosis
2. **Home service booking** for doctors, filtered by the patient's location

---

## Feature 1: Doctor-Approved Drug Prescriptions

### How It Works

Currently, after diagnosis, drug recommendations are shown immediately to the patient. The new flow:

```text
Patient gets diagnosed
        |
        v
Drug recommendations saved as "pending_review"
(Patient sees: "Medications pending doctor review")
        |
        v
A doctor is auto-assigned OR patient books an appointment
        |
        v
Doctor sees pending prescriptions on their dashboard
Doctor approves/modifies/rejects each drug
        |
        v
Patient gets notified, approved drugs are displayed
```

### Database Changes

**New table: `pending_drug_approvals`**
- `id` (uuid, PK)
- `patient_id` (uuid, references profiles.user_id)
- `doctor_id` (uuid, nullable, references profiles.user_id) -- assigned when a doctor picks it up
- `diagnosis_session_id` (text) -- links to the AI diagnosis session
- `condition_name` (text)
- `condition_id` (integer)
- `drugs` (jsonb) -- array of recommended drugs from AI
- `approved_drugs` (jsonb, nullable) -- doctor's approved/modified list
- `status` (text: 'pending', 'under_review', 'approved', 'rejected')
- `doctor_notes` (text, nullable)
- `created_at`, `updated_at` (timestamptz)

RLS policies:
- Patients can SELECT their own rows
- Doctors can SELECT rows assigned to them or unassigned, and UPDATE status/approved_drugs
- Service role for inserts from edge functions

### Code Changes

**`src/components/diagnostic/DiagnosisResultScreen.tsx`**
- After diagnosis completes, instead of showing drugs directly, save them to `pending_drug_approvals` with status='pending'
- Show a "Medications Pending Doctor Review" card with a message explaining a doctor needs to confirm the prescription
- Add a "Book Doctor to Review" button that navigates to `/book-appointment` with diagnosis context
- If the user already has an approved prescription for this session, show the approved drugs

**New component: `src/components/PendingPrescriptionCard.tsx`**
- Shows the pending status with a nice UI
- Polls or uses realtime subscription for status changes
- When status changes to 'approved', displays the approved drugs

**New component: `src/components/doctor/PendingPrescriptionReview.tsx`**
- Shows doctors a list of pending prescriptions assigned to them
- Each prescription shows: patient info, diagnosis condition, AI-recommended drugs
- Doctor can approve all, approve with modifications, or reject with notes
- On approval, updates `status` to 'approved' and fills `approved_drugs`
- Creates a notification for the patient

**`src/pages/doctor/DoctorDashboard.tsx` or `DoctorAppointments.tsx`**
- Add a "Pending Prescriptions" section/tab showing unreviewed prescriptions
- Badge count for pending items

**`src/components/AppSidebar.tsx`** (user side)
- Add "My Prescriptions" link if not already prominent -- this already exists

### Notification Flow
- When a prescription is submitted for review, notify available doctors
- When a doctor approves/rejects, notify the patient via the existing notifications table

---

## Feature 2: Home Service Booking

### How It Works
- Doctors can opt-in to offer home visits and specify which locations (country + state) they serve
- When a patient books, they can choose "Clinic Visit" or "Home Service"
- For home service, only doctors available in the patient's location are shown
- Patient's location is auto-detected from their profile (`location_country`, `location_state`)

### Database Changes

**Add columns to `doctors` table:**
- `offers_home_service` (boolean, default false)
- `home_service_fee` (numeric, nullable) -- additional fee for home visits
- `service_locations` (jsonb, nullable) -- array of {country, state} objects

**Add columns to `appointments` table:**
- `appointment_type` (text, default 'clinic') -- 'clinic' or 'home_service'
- `patient_address` (text, nullable) -- for home service appointments

**Add columns to `public_doctor_profiles` table:**
- `offers_home_service` (boolean, default false)
- `home_service_fee` (numeric, nullable)
- `service_locations` (jsonb, nullable)

Update the `refresh_public_doctor_profile` function to sync these new fields.

### Code Changes

**`src/pages/BookAppointment.tsx`**
- Add appointment type selector: "Clinic Visit" vs "Home Service"
- When "Home Service" is selected:
  - Auto-detect patient location from profile (`location_country`, `location_state`)
  - Filter doctors list to only show those with `offers_home_service = true` AND whose `service_locations` includes the patient's location
  - Show address input field for the patient
  - Display home service fee alongside consultation fee
- When "Clinic Visit" is selected, show all doctors as before

**`src/pages/doctor/DoctorProfile.tsx`**
- Add toggle for "Offer Home Service"
- When enabled, show:
  - Home service fee input
  - Service locations picker (country + state multi-select)
- Save to doctors table

**`supabase/functions/bookAppointment/index.ts`**
- Accept new fields: `appointment_type`, `patient_address`
- Validate: if `appointment_type = 'home_service'`, verify doctor offers it and serves patient's location
- Store the appointment type and address

**`src/pages/doctor/DoctorAppointments.tsx`**
- Show appointment type badge (Clinic / Home Service)
- Show patient address for home service appointments

---

## Fix: Build Error in `usePushNotifications.ts`

The TypeScript error about `pushManager` is a type definition issue. Fix by adding a type assertion for the ServiceWorkerRegistration since the Push API types may not be included in the project's TS config.

**`src/hooks/usePushNotifications.ts`**
- Cast `registration` to `any` for the `pushManager` calls, or add `"lib": ["DOM", "WebWorker"]` -- simplest fix is the cast since Push API is a runtime feature.

---

## Files Summary

| Action | File |
|--------|------|
| **DB Migration** | Create `pending_drug_approvals` table with RLS |
| **DB Migration** | Add `offers_home_service`, `home_service_fee`, `service_locations` to `doctors` |
| **DB Migration** | Add `appointment_type`, `patient_address` to `appointments` |
| **DB Migration** | Add home service fields to `public_doctor_profiles` + update refresh function |
| Create | `src/components/PendingPrescriptionCard.tsx` |
| Create | `src/components/doctor/PendingPrescriptionReview.tsx` |
| Update | `src/components/diagnostic/DiagnosisResultScreen.tsx` |
| Update | `src/pages/BookAppointment.tsx` |
| Update | `src/pages/doctor/DoctorProfile.tsx` |
| Update | `src/pages/doctor/DoctorAppointments.tsx` |
| Update | `supabase/functions/bookAppointment/index.ts` |
| Fix | `src/hooks/usePushNotifications.ts` (build error) |

