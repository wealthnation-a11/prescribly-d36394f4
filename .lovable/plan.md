# Implementation Plan: Multi-Feature Update

This plan covers 6 major changes across the diagnostic flow, landing page, admin dashboard, and booking system.

---

## 1. Diagnosis Results: Blur + "Consult a Doctor" CTA

**Problem:** Currently, diagnosis results and drug recommendations are shown directly. The user wants them blurred with a stylish overlay prompting doctor consultation.

**Changes to `src/components/diagnostic/DiagnosisResultScreen.tsx`:**

- After the diagnosis loads, blur the "Most Likely Condition" card, "Other Possible Conditions" card, and the `PendingPrescriptionCard` using CSS `filter: blur(6px)` and `pointer-events: none`
- Overlay a stylish glass-morphism card on top with:
  - A lock/stethoscope icon
  - Text: "Consult a Doctor to Confirm Your Diagnosis"
  - A prominent animated button: "Chat or Call a Doctor Now"
- Clicking the button navigates to `/book-appointment/chat` with the diagnosis session data passed via `navigate` state
- Once the doctor approves the appointment (status changes to `approved`), the blur is removed — check `pending_drug_approvals` status via the existing real-time subscription in `PendingPrescriptionCard`
- Add a "Forward to Doctor" button that appears after doctor approval, which sends the diagnosis report to the doctor's chat inbox via the existing messaging system (insert into `messages` table)  
Make the diagnosis section, add color to it and make the page mobile responsive, its scrollable, i want it to be when on mobile behave like mobile and when on desktop behave like desktop

**Changes to `src/components/PendingPrescriptionCard.tsx`:**

- Export the approval status so the parent `DiagnosisResultScreen` can react to it
- Add a callback prop `onStatusChange` to notify the parent

---

## 2. Landing Page: Healthcare Plans for Organizations

**Problem:** The "Healthcare Plans for Organizations" card currently shows $200/month with an enterprise demo button. Need to make it free, "Coming Soon", and replace the button with a hospital registration form.

**Changes to `src/components/LandingPage.tsx` (both monthly and yearly tabs, lines ~399-464 and ~545-610):**

- Change pricing from `$200/month` to `Free`
- Add a "Coming Soon" badge prominently
- Remove the "Request Enterprise Demo" button
- Replace with a "Register Your Hospital" button that opens a modal

**New component: `src/components/landing/HospitalRegistrationForm.tsx`:**

- Modal form with fields: Hospital Name, Type (hospital/clinic/pharmacy), Address, City, State, Country, Phone, Email, Contact Person, Latitude/Longitude (auto-detect via browser geolocation), Description, Logo upload
- On submit, insert into a new `hospital_registrations` table with status `pending`
- Show success message: "Your application has been submitted for review"

**Database migration:**

- Create `hospital_registrations` table:
  - `id` UUID PK
  - `name`, `type`, `address`, `city`, `state`, `country`, `phone`, `email`, `contact_person`, `description` text fields
  - `latitude`, `longitude` float
  - `logo_url` text
  - `status` enum: `pending`, `approved`, `rejected`
  - `admin_notes` text
  - `created_at`, `updated_at` timestamps
- RLS: authenticated users can INSERT, admins can SELECT/UPDATE

---

## 3. Admin Dashboard: Hospital Registration Management

**New component: `src/components/admin/HospitalRegistrationManagement.tsx`:**

- Table listing all hospital registration applications
- Filter by status (pending/approved/rejected)
- Approve/Reject buttons with notes
- On approve: automatically insert into the `facilities` table with the hospital's geolocation data so it shows up on the NearbyHospitals map
- On reject: update status with admin notes

**Changes to `src/pages/AdminDashboard.tsx` and `src/components/admin/AdminSidebar.tsx`:**

- Add "Hospital Applications" tab/section

---

## 4. Fix Admin Doctor Approval

**Problem:** Two issues identified:

1. The GET query uses `supabase.functions.invoke('admin-doctors?${queryParams}')` — query params appended to the function name won't work with Supabase's invoke method. The params need to be in the body or the full URL must be constructed manually.
2. The edge function's CORS headers are missing the extended Supabase client headers.

**Changes to `src/components/admin/DoctorApplicationsManagement.tsx` (line 66):**

- Change GET request to use body-based approach:

```typescript
const { data, error } = await supabase.functions.invoke('admin-doctors', {
  method: 'POST',
  body: { action: 'list', status: activeTab !== 'all' ? activeTab : undefined, page: 1, limit: 50 },
});
```

**Changes to `supabase/functions/admin-doctors/index.ts`:**

- Update CORS headers to include all Supabase client headers
- Add handler for `body.action === 'list'` in the POST block that runs the existing GET logic
- Keep GET method as fallback

---

## 5. Fix Booking System Edge Function Error

**Problem:** The `bookAppointment` edge function CORS was partially fixed in the last diff, but the function needs to be redeployed. Also need to verify the `admin-doctors` function is deployed with updated CORS.

**Changes to `supabase/functions/bookAppointment/index.ts`:**

- Already has updated CORS headers from last edit — verify deployment

**Deployment:**

- Redeploy `bookAppointment` edge function
- Redeploy `admin-doctors` edge function after CORS fix

---

## 6. "Forward to Doctor" Feature in Diagnosis Results

**Changes to `src/components/diagnostic/DiagnosisResultScreen.tsx`:**

- After doctor approves the prescription (status changes from `pending` to `approved`), show a "Send Report to Doctor" button
- Clicking it inserts a message into the `messages` table for the doctor with the diagnosis PDF/summary
- The message appears in the doctor's messaging inbox

---

## New Sections Needed


| Section | New Feature                                   | Location                    |
| ------- | --------------------------------------------- | --------------------------- |
| Patient | Blurred diagnosis with "Consult Doctor" CTA   | DiagnosisResultScreen       |
| Patient | "Forward to Doctor" button post-approval      | DiagnosisResultScreen       |
| Admin   | Hospital Registration Applications management | AdminDashboard              |
| Landing | Hospital Registration Form modal              | LandingPage pricing section |


---

## Files to Create

- `src/components/landing/HospitalRegistrationForm.tsx`
- `src/components/admin/HospitalRegistrationManagement.tsx`

## Files to Modify

- `src/components/diagnostic/DiagnosisResultScreen.tsx`
- `src/components/PendingPrescriptionCard.tsx`
- `src/components/LandingPage.tsx`
- `src/components/admin/DoctorApplicationsManagement.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/pages/AdminDashboard.tsx`
- `supabase/functions/admin-doctors/index.ts`

## Database Migration

- Create `hospital_registrations` table with RLS policies