-- Fix infinite recursion in RLS policies by using has_role() security definer function

-- Step 1: Drop broken policies on user_roles table
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;

-- Step 2: Create fixed policies on user_roles using has_role() function
-- Users can view their own roles (simple auth.uid() check - no recursion)
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all roles (uses security definer function)
CREATE POLICY "Admins can view all roles" ON user_roles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Admins can insert roles
CREATE POLICY "Admins can insert roles" ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins can update roles
CREATE POLICY "Admins can update roles" ON user_roles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Admins can delete roles
CREATE POLICY "Admins can delete roles" ON user_roles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Step 3: Fix profiles policies that have recursion issues
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Doctors can view patient profiles" ON profiles;

-- Create fixed admin policy using has_role()
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Create fixed doctor policy using has_role()
CREATE POLICY "Doctors can view patient profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'doctor') AND
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.doctor_id = auth.uid()
      AND appointments.patient_id = profiles.user_id
      AND appointments.status IN ('pending', 'approved', 'completed')
    )
  );