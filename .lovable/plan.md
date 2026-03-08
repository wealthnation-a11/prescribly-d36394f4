

# Plan: Fix Items 2, 4, 7, 8, 9, 10

## Items Overview

| # | Issue | Fix |
|---|-------|-----|
| 2 | Push notifications are stubs (VAPID placeholder) | Remove placeholder, use Supabase Realtime + native Notification API instead |
| 4 | Email notifications never triggered | Wire `send-appointment-email` into the `notify_appointment_changes` DB trigger |
| 7 | Doctor not notified of pending prescriptions from booking | Add realtime subscription for `pending_drug_approvals` in `RealtimeNotifications` |
| 8 | Session/auth edge cases | Already solid -- minor: fetch profile on `TOKEN_REFRESHED` too |
| 9 | NearbyHospitals no fallback when geolocation denied | Show "Enable location" message with a manual search CTA |
| 10 | Security: verify `useUserRole` uses `user_roles` table | Already correct -- uses `has_role()` RPC which queries `user_roles`. But `AuthContext` fetches role from `profiles` -- align `ProtectedRoute` to only use `useUserRole` (already does). Minor: ensure new users get a `user_roles` row |

---

## Detailed Changes

### Item 2: Push Notifications -- Replace VAPID stub with browser Notification API

Since Web Push with VAPID requires server infrastructure that isn't configured, replace the stub with a working approach:

- **`usePushNotifications.ts`**: Remove the VAPID/service-worker subscription code. Instead, use the browser `Notification` API directly. When permission is granted, show native browser notifications from the existing Supabase Realtime channel (already in `RealtimeNotifications`).
- **`RealtimeNotifications.tsx`**: When a new notification arrives via realtime AND `Notification.permission === 'granted'`, call `new Notification(title, { body })` to show an OS-level notification.
- **`NotificationSettings.tsx`**: Simplify to just request `Notification.permission` -- no VAPID subscription needed.
- **`send-push-notification` edge function**: Update to be a proper notification creator (insert into `notifications` table + return success) since real-time handles delivery.

### Item 4: Wire email notifications into appointment flow

The `notify_appointment_changes()` DB trigger already inserts notifications and calls `pg_notify()`, but nothing listens to that channel. Instead:

- **Modify `notify_appointment_changes()` DB function** via migration: After inserting the notification, call `net.http_post()` to invoke the `send-appointment-email` edge function directly (using `pg_net` extension). This sends email on appointment creation and status changes.
- This requires enabling the `pg_net` extension via migration.

### Item 7: Doctor notification for pending prescriptions

- **`RealtimeNotifications.tsx`**: Add a new Supabase Realtime channel subscribing to `INSERT` events on `pending_drug_approvals` table. When a new row arrives, invalidate `['pending-prescriptions']` query and show a toast: "New prescription review request."
- Since `pending_drug_approvals` doesn't filter by doctor (any available doctor can review), subscribe without a filter and let the toast notify all logged-in doctors.

### Item 8: Session edge case -- profile refresh on token refresh

- **`AuthContext.tsx`**: Add `TOKEN_REFRESHED` to the `onAuthStateChange` handler to re-fetch the profile, ensuring stale profile data is refreshed after token rotation.

### Item 9: NearbyHospitals geolocation fallback

- **`NearbyHospitals.tsx`**: Instead of returning `null` when no facilities found or geolocation denied, show a fallback UI with:
  - A message: "Enable location access to find hospitals near you"
  - A "Browse All Hospitals" button linking to `/book-appointment/facility`
  - Show the section always (don't hide it)

### Item 10: Security alignment

- **`useUserRole`**: Already correct -- uses `has_role()` RPC querying `user_roles` table. No change needed.
- **DB Migration**: Add a trigger on `profiles` INSERT that also creates a corresponding `user_roles` row, ensuring new users always have a role in both tables. The `handle_new_user()` function already sets `profiles.role`, and `sync_profile_role_from_user_roles` syncs the other direction. Add a reverse sync: `sync_user_roles_from_profile` trigger on `profiles` INSERT.

---

## Files to Modify

1. `src/hooks/usePushNotifications.ts` -- Simplify to browser Notification API only
2. `src/components/RealtimeNotifications.tsx` -- Add native notifications + pending prescriptions channel
3. `src/components/NotificationSettings.tsx` -- Simplify UI (remove VAPID references)
4. `src/components/landing/NearbyHospitals.tsx` -- Add geolocation fallback UI
5. `src/contexts/AuthContext.tsx` -- Handle TOKEN_REFRESHED event

## Database Migrations

1. Enable `pg_net` extension and update `notify_appointment_changes()` to call `send-appointment-email` via `net.http_post()`
2. Add trigger `sync_user_roles_on_profile_insert` on `profiles` table to insert into `user_roles`

## Edge Functions

1. Redeploy `send-appointment-email` with updated CORS headers

