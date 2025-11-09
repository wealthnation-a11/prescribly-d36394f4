# Push Notifications Setup Guide

This app now supports Web Push notifications for appointment reminders and health tips. To enable this feature, you need to configure VAPID keys.

## Setup Steps

### 1. Generate VAPID Keys

You can generate VAPID keys using the `web-push` npm package:

```bash
npx web-push generate-vapid-keys
```

This will output:
- Public Key (for client-side)
- Private Key (for server-side)

### 2. Configure the Keys

#### Client-Side (Update the hook)
Edit `src/hooks/usePushNotifications.ts` and replace the placeholder:

```typescript
const publicVapidKey = 'YOUR_PUBLIC_VAPID_KEY'; // Replace with your public key
```

#### Server-Side (Add as Supabase secret)
Add the private key as a Supabase secret:

1. Go to your Supabase project dashboard
2. Navigate to Settings > Edge Functions
3. Add a new secret:
   - Name: `VAPID_PRIVATE_KEY`
   - Value: Your private VAPID key

### 3. Update the Push Notification Edge Function

Edit `supabase/functions/send-push-notification/index.ts` to implement the actual web-push library:

```typescript
import webpush from 'https://esm.sh/web-push@3.6.6';

// Configure web-push with your VAPID keys
const vapidPublicKey = 'YOUR_PUBLIC_KEY';
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidPublicKey,
  vapidPrivateKey
);

// Then use webpush.sendNotification() in the sendPushNotification function
```

### 4. Enable Notifications in User Profile

Users can enable push notifications in their profile settings:
1. Go to User Profile
2. Scroll to "Push Notifications" section
3. Click "Enable Push Notifications"
4. Accept the browser permission prompt

## Features

Once configured, users will receive push notifications for:

- **Appointment Reminders**: 1 hour before scheduled appointments
- **Appointment Status**: When appointments are approved/cancelled
- **Daily Health Tips**: Wellness advice and reminders
- **Prescription Updates**: When new prescriptions are issued

## Schedule Reminder Notifications

To automatically send appointment reminders, set up a cron job to call the edge function:

```sql
-- Run every hour to check for upcoming appointments
select cron.schedule(
  'appointment-reminders',
  '0 * * * *',
  $$
  select net.http_post(
    url:='https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/schedule-appointment-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

## Testing

Test push notifications by calling the edge function manually:

```typescript
const { data } = await supabase.functions.invoke('send-push-notification', {
  body: {
    userId: 'user-id',
    title: 'Test Notification',
    body: 'This is a test push notification',
    url: '/dashboard',
    type: 'test'
  }
});
```

## Browser Support

Push notifications work on:
- Chrome/Edge (Desktop & Android)
- Firefox (Desktop & Android)
- Safari (Desktop & iOS 16.4+)
- Opera (Desktop & Android)

Note: iOS requires iOS 16.4+ and the PWA must be installed to home screen.

## Session Persistence

The app automatically keeps users logged in using Supabase's built-in session management:
- Sessions are stored in localStorage
- Auto-refresh tokens keep users authenticated
- Sessions persist across browser restarts
- Users stay logged in until they explicitly sign out

No additional configuration is needed for session persistence.
