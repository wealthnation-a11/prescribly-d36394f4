

# Audit: What's Left (Excluding Payment & Herbal)

After cross-checking the entire codebase, here are the remaining issues:

---

## 1. Admin Dashboard: Duplicate `registration-codes` Case (Bug)

Lines 204-214 handle `registration-codes` correctly (shows `RegistrationCodeVerification`), but lines 231-244 have a **second** `registration-codes` case that renders `AdminProfile` instead. This second case is dead code — it never executes. Meanwhile, the sidebar has a "My Profile" item with `id: "profile"`, but `renderContent()` has **no `case "profile"`**. Clicking "My Profile" shows nothing.

**Fix:** Change the duplicate `case "registration-codes"` (line 231) to `case "profile"` so the AdminProfile actually renders.

---

## 2. Email Notification: Still a Stub

`send-email-notification` edge function (line 42) just generates a `mailto:` link and returns it — no actual email is sent. This is fine as a placeholder, but worth noting it's not functional without an SMTP/email provider integration (Resend, SendGrid, etc.).

**Status:** Known limitation, no code fix needed unless user wants to integrate an email provider.

---

## 3. Push Notification Edge Function: Still a Stub

`send-push-notification` function's `sendPushNotification()` (line 26) just `return true` without sending anything. The browser Notification API workaround was added in `RealtimeNotifications`, so in-app notifications work. The edge function is only called from `schedule-appointment-reminders` — those server-triggered pushes won't actually reach users.

**Status:** Known limitation. Browser notifications work for active sessions only.

---

## 4. No Other Missing Routes or Broken Features

- All non-herbal routes are defined and reachable
- `useUserRole` correctly uses `has_role()` RPC (secure, uses `user_roles` table)
- `ProtectedRoute` uses `useUserRole` — secure
- Doctor approval edge function (`admin-doctors`) looks correct
- Hospital registration form allows anon submissions (RLS fixed)
- `NearbyHospitals` has geolocation fallback (fixed previously)
- Auth context handles `TOKEN_REFRESHED` (fixed previously)
- Realtime notifications include `pending_drug_approvals` channel (fixed previously)

---

## Summary: Only 1 Code Fix Needed

| Issue | Effort | Action |
|-------|--------|--------|
| Admin "My Profile" renders nothing (duplicate case bug) | Tiny | Fix `case "registration-codes"` → `case "profile"` |
| Email notifications are stubs | N/A | Document as future work (needs email provider) |
| Server-side push is stub | N/A | Document as future work (browser notifications work) |

## Implementation

**File:** `src/pages/AdminDashboard.tsx`
- Line 231: Change `case "registration-codes":` to `case "profile":` — this is the only code change needed.

