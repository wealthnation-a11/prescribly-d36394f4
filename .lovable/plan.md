

# Plan: Hospital-Facing Code Verification Page

## The Problem

Currently, when a patient generates a registration code for a facility visit, only the **admin dashboard** can verify codes. There is no way for hospital/facility staff to verify a patient's code when they arrive. The flow is broken at the last step.

## Solution

Create a **public, standalone verification page** at `/verify-code` that hospital staff can use to look up and confirm patient registration codes — no login required.

### How It Works

1. Patient arrives at the hospital and shows their 6-character code or QR code
2. Hospital staff opens `/verify-code` on any device (phone, tablet, desktop)
3. Staff types in the 6-character code (or scans QR)
4. The page looks up the code and shows: patient name, facility name, status, expiry
5. Staff clicks "Confirm Visit" to mark the code as used

### Page Design

- Clean, single-purpose page with a large code input field (6 characters)
- "Verify" button triggers a lookup against `registration_codes` table
- Shows result card with patient details, facility match, and status (active/expired/used)
- "Confirm Visit" button marks it as `used` with `confirmed_at` timestamp
- No authentication required — the code itself is the authentication token (short-lived, single-use)

### Technical Details

**New file: `src/pages/VerifyCode.tsx`**
- Standalone page (no sidebar, no auth required)
- Input for 6-char code, calls Supabase to look up by `code` column
- Joins to `profiles` (patient name) and `facilities` (facility name) for display
- Confirm mutation updates `status = 'used'` and `confirmed_at = now()`

**Modified: `src/App.tsx`**
- Add public route: `<Route path="/verify-code" element={<VerifyCode />} />`

**Database migration:**
- Add RLS policy on `registration_codes` allowing `anon` to SELECT by code value and UPDATE status (only `active` → `used`)
- This is safe because codes are short-lived (24h) and single-use

### Files

| File | Action |
|------|--------|
| `src/pages/VerifyCode.tsx` | Create — standalone verification page |
| `src/App.tsx` | Add `/verify-code` route |
| Migration | RLS policy for anon SELECT + UPDATE on `registration_codes` |

