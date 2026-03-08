# Hospital Staff Dashboard

## Current State

Right now, `/verify-code` is a simple public page where anyone can type a 6-character code to verify it. There's no concept of "hospital staff accounts" — no login, no dashboard, no patient file access.

## What's Needed

A proper hospital dashboard requires:

1. **Hospital staff accounts** — staff members linked to a specific facility
2. **Hospital login page** — dedicated login for facility staff
3. **Hospital dashboard** — shows all codes for their facility, patient visit history, and patient details upon code verification

## How Hospitals Get Access

You (as admin) would create staff accounts for each hospital. When a hospital registers and gets approved, you assign credentials or invite staff via email. Staff log in at `/facility-login` and see only data for their facility.

&nbsp;

&nbsp;

## Plan

### Database Changes

1. **New `facility_staff` table** — links a user to a facility:
  - `user_id` (references auth.users), `facility_id` (references facilities), `role` (receptionist/manager), `is_active`
  - RLS: staff can only read their own record; admins can manage all
2. **New `facility_staff` role in `app_role` enum** or use a separate check function `is_facility_staff(_user_id, _facility_id)` (SECURITY DEFINER)
3. **RLS on `registration_codes**` — facility staff can SELECT codes where `facility_id` matches their assigned facility

### New Pages

1. `**/facility-login**` — simple login page for hospital staff (uses standard Supabase auth, redirects to facility dashboard)
2. `**/facility-dashboard**` — protected route, only accessible to facility staff:
  - **Code verification tab**: Enter/scan code, see patient details, confirm arrival
  - **Recent visits tab**: List of all registration codes for their facility (pending, confirmed, expired)
  - **Patient details view**: After confirming a code, show patient name, appointment info, visit history at this facility

### New Components

- `FacilityLayout` — sidebar with navigation (Verify Code, Recent Visits, Profile)
- `FacilityDashboard` — main dashboard with stats (today's visits, pending arrivals)
- `FacilityCodeVerification` — enhanced version of current VerifyCode, scoped to facility
- `FacilityVisitHistory` — table of all codes/visits for this facility

### Route Protection

- New `FacilityRoute` wrapper that checks `facility_staff` table membership
- Add routes to `App.tsx`:
  - `/facility-login` (public)
  - `/facility-dashboard` (protected)
  - `/facility-dashboard/verify` (protected)
  - `/facility-dashboard/visits` (protected)

### Admin Integration

- Add a "Facility Staff" management section in admin dashboard (or within facility management) so admins can:
  - Create staff accounts for approved facilities
  - Assign/revoke staff access

### How a Hospital Gets Their Dashboard

1. Hospital submits registration form on landing page
2. Admin approves the registration (already working)
3. Admin creates a staff account for the hospital (new feature) — enters email, selects facility, sets temporary password
4. Hospital receives credentials and logs in at `/facility-login`
5. Hospital staff sees their dashboard with code verification and visit history

## Files Summary


| File                                                                   | Action                            |
| ---------------------------------------------------------------------- | --------------------------------- |
| Migration: `facility_staff` table + RLS + `is_facility_staff` function | Create                            |
| `src/pages/FacilityLogin.tsx`                                          | Create                            |
| `src/pages/facility/FacilityDashboard.tsx`                             | Create                            |
| `src/pages/facility/FacilityCodeVerification.tsx`                      | Create                            |
| `src/pages/facility/FacilityVisitHistory.tsx`                          | Create                            |
| `src/components/FacilityLayout.tsx`                                    | Create                            |
| `src/components/FacilitySidebar.tsx`                                   | Create                            |
| `src/components/admin/FacilityStaffManagement.tsx`                     | Create                            |
| `src/App.tsx`                                                          | Add routes                        |
| `src/pages/AdminDashboard.tsx`                                         | Add facility staff management tab |
