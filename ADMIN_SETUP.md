# Admin Account Setup Instructions

## Creating Your Secure Admin Account

To set up your admin account securely **without hardcoded credentials**, follow these steps:

### Step 1: Register Normally
1. Go to the registration page: `/register`
2. Sign up with your email: `prescribly@gmail.com`
3. Complete the registration process

### Step 2: Set Admin Role in Database
Once registered, you need to update your role to 'admin' in the database:

1. **Go to Supabase Dashboard**:
   - Navigate to: https://supabase.com/dashboard/project/zvjasfcntrkfrwvwzlpk

2. **Open SQL Editor**:
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run this SQL command** (replace with your actual user_id):
   ```sql
   -- First, find your user_id
   SELECT user_id, email, role FROM profiles WHERE email = 'prescribly@gmail.com';
   
   -- Then update the role to admin
   UPDATE profiles 
   SET role = 'admin' 
   WHERE email = 'prescribly@gmail.com';
   ```

4. **Verify the update**:
   ```sql
   SELECT user_id, email, role FROM profiles WHERE email = 'prescribly@gmail.com';
   ```
   You should see `role: 'admin'`

### Step 3: Access Admin Dashboard
1. Log out if you're currently logged in
2. Log in with your credentials:
   - Email: `prescribly@gmail.com`
   - Password: Your chosen password
3. You'll automatically be redirected to `/admin-dashboard`

### Alternative: Direct Database Access
You can also update the role directly in the Supabase dashboard:

1. Go to "Table Editor" → "profiles" table
2. Find your user by email
3. Edit the row and change `role` to `admin`
4. Save changes

## Security Notes

✅ **This approach is secure because:**
- No credentials are stored in code
- Authentication uses Supabase's secure auth system
- Admin role is verified server-side in every request
- Role checks happen in the database, not client-side

❌ **Never do this:**
- Hard-code admin credentials in the source code
- Store passwords in environment variables
- Create account switching mechanisms
- Skip proper authentication flow

## Admin Dashboard Features

Once logged in as admin, you'll have access to:
- **Analytics**: Platform overview and metrics
- **Users**: Manage all user accounts
- **Doctors**: Approve/reject doctor applications
- **Appointments**: Monitor all appointments
- **Payments**: Track all transactions
- **AI Logs**: Monitor AI diagnosis performance

## Accessing the Admin Dashboard

The admin dashboard is hidden from public navigation and only accessible by:
1. Direct URL: `/admin-dashboard`
2. Being logged in with admin role
3. Server-side role verification on every request

No one can access it without proper authentication and admin role assignment.
