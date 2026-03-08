

# Hospital Registration & Dashboard Revamp

## What Changes

### 1. Hospital Registration Flow Redesign
- **Landing page "Register Your Hospital" button** → Instead of opening a modal dialog, redirect to a dedicated page at `/hospital` (i.e. `prescribly.app/hospital`)
- **`/hospital` page** = A standalone registration + login page (like the doctor portal has `/doctor-register` and `/doctor-login`)
  - Has two tabs: **Register** (the current hospital registration form fields) and **Login** (the current facility login form)
  - After registration submission, automatically switch to the Login tab with a success message
  - Registration creates a `hospital_registrations` entry (already exists) — admin approves, then creates staff credentials

### 2. Enhanced Code Verification — Show Full Patient Data
When hospital staff enters a patient's 6-character code, they currently only see name + facility + timestamps. We'll expand this to show the patient's full profile data from Prescribly:
- Date of birth, gender, phone, email
- Medical history (if available)
- Country/location
- Previous visit history at this facility

This requires updating the `verify_registration_code` database function to return additional profile columns.

### 3. Hospital Dashboard Database — Patient Records
Add a `facility_patient_records` table so hospitals can store their own notes/data per patient visit:
- `facility_id`, `patient_id`, `visit_code_id`, `diagnosis`, `treatment_notes`, `vitals`, `follow_up_date`, `created_by` (staff user), timestamps
- RLS: only staff of that facility can read/write
- The dashboard gets a "Patient Records" section where staff can add notes after confirming a visit

### 4. Route & Navigation Changes
- New route: `/hospital` → combined register/login page
- Remove `/facility-login` (redirect to `/hospital`)
- Add "Patient Records" to facility sidebar
- Landing page buttons link to `/hospital` instead of opening modal

## Files Summary

| File | Action |
|------|--------|
| `src/pages/HospitalPortal.tsx` | Create — combined register/login page at `/hospital` |
| `src/components/LandingPage.tsx` | Modify — change "Register Your Hospital" buttons to navigate to `/hospital` |
| Migration: expand `verify_registration_code` + create `facility_patient_records` table | Create |
| `src/pages/facility/FacilityCodeVerification.tsx` | Modify — show expanded patient profile data |
| `src/pages/facility/FacilityPatientRecords.tsx` | Create — view/add patient visit records |
| `src/components/FacilitySidebar.tsx` | Modify — add Patient Records menu item |
| `src/App.tsx` | Modify — add `/hospital` route, redirect `/facility-login` → `/hospital` |
| `src/pages/FacilityLogin.tsx` | Remove or redirect |

## Technical Details

**`verify_registration_code` function update:** Add `patient_email`, `patient_phone`, `patient_dob`, `patient_gender`, `patient_country`, `patient_medical_history` to the return columns from the profiles join.

**`facility_patient_records` table:**
- Columns: `id`, `facility_id` (FK facilities), `patient_id` (FK profiles.user_id), `registration_code_id` (FK registration_codes), `diagnosis`, `treatment_notes`, `vitals` (jsonb), `follow_up_date`, `created_by` (FK auth.users), `created_at`, `updated_at`
- RLS: `is_facility_staff(auth.uid(), facility_id)` for all operations

**`/hospital` page design:**
- Clean standalone page (no app sidebar)
- Two-tab layout: Register | Login
- Register tab contains the same fields as current `HospitalRegistrationForm` modal
- Login tab contains the same fields as current `FacilityLogin`
- After successful registration, switches to Login tab with a toast

