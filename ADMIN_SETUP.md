# Admin Account Setup Instructions

## Creating Your Secure Admin Account

This application follows security best practices by storing user roles in a **separate secure table** (`user_roles`) instead of the profiles table. This prevents privilege escalation attacks.

### Step 1: Register Normally
1. Go to the registration page: `/register`
2. Sign up with your email: `prescribly@gmail.com`
3. Complete the registration process

### Step 2: Set Admin Role in Database
Once registered, you need to assign the admin role via the `user_roles` table:

1. **Go to Supabase Dashboard**:
   - Navigate to: https://supabase.com/dashboard/project/zvjasfcntrkfrwvwzlpk

2. **Open SQL Editor**:
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run this SQL command**:
   ```sql
   -- First, find your user_id
   SELECT user_id, email, first_name, last_name, role 
   FROM profiles 
   WHERE email = 'prescribly@gmail.com';
   
   -- Then insert the admin role into user_roles table
   INSERT INTO user_roles (user_id, role)
   SELECT user_id, 'admin'::user_role
   FROM profiles
   WHERE email = 'prescribly@gmail.com'
   ON CONFLICT (user_id, role) DO NOTHING;
   
   -- Verify the admin role was assigned
   SELECT ur.*, p.email, p.first_name, p.last_name
   FROM user_roles ur
   JOIN profiles p ON p.user_id = ur.user_id
   WHERE ur.role = 'admin';
   ```

4. **Result**: You should see your user with `role: 'admin'` in the user_roles table

### Step 3: Access Admin Dashboard
1. Log out if you're currently logged in
2. Log in with your credentials:
   - Email: `prescribly@gmail.com`
   - Password: Your chosen password
3. You'll automatically be redirected to `/admin-dashboard` or navigate to it directly

## Admin Capabilities

Once you have admin access, you get:

### Full Platform Access
- ✅ **No subscription required** - Admins bypass all subscription checks automatically
- ✅ **Access all sections** - View both patient and doctor sections
- ✅ **Platform-wide visibility** - See all users, appointments, prescriptions, payments

## Security Notes

✅ **This approach is secure because:**
- Roles stored in separate `user_roles` table, not in profiles
- `has_role()` function uses SECURITY DEFINER to prevent RLS recursion
- Admin role verified server-side in every request via RLS policies
- No credentials stored in code
- Authentication uses Supabase's secure auth system
- First admin must be created via SQL (prevents self-promotion)

❌ **Never do this:**
- Hard-code admin credentials in the source code
- Store roles in profiles table (privilege escalation risk)
- Check admin status client-side (can be manipulated)
- Skip proper authentication flow

## Security Architecture

### User Roles Table
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  role user_role NOT NULL,
  UNIQUE(user_id, role)
);
```

### has_role() Function
```sql
CREATE FUNCTION has_role(_user_id uuid, _role user_role)
RETURNS boolean
SECURITY DEFINER  -- Bypasses RLS during check
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

## Admin Dashboard Features

Once logged in as admin, you'll have access to:
- **Analytics**: Platform overview and metrics
- **Users**: Manage all user accounts
- **Roles**: Assign/remove user roles (admin, doctor, patient)
- **Subscriptions**: Grant/revoke legacy status, manage access
- **Doctors**: Approve/reject doctor applications
- **Appointments**: Monitor all appointments
- **Payments**: Track all transactions
- **AI Logs**: Monitor AI diagnosis performance

## Accessing the Admin Dashboard

The admin dashboard is hidden from public navigation and only accessible by:
1. Direct URL: `/admin-dashboard`
2. Being logged in with admin role (verified via user_roles table)
3. Server-side role verification on every request
4. Automatic bypass of all subscription requirements

## Troubleshooting

### Cannot Access Admin Dashboard
```sql
-- Check if admin role exists
SELECT * FROM user_roles WHERE user_id = 'your-user-id';

-- Re-assign admin role if needed
INSERT INTO user_roles (user_id, role)
VALUES ('your-user-id', 'admin')
ON CONFLICT DO NOTHING;
```

### Still Seeing Subscription Prompts
- This should not happen for admins
- Check `SubscriptionGuard.tsx` has admin bypass
- Clear browser cache and re-login

No one can access the admin dashboard without proper authentication and admin role assignment in the secure user_roles table.
