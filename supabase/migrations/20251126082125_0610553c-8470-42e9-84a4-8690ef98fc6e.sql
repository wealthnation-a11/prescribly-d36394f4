-- Security Enhancement Migration
-- Fix RLS policies, function security, and data access controls

-- 1. Add RLS policies for tables that have RLS enabled but no policies
-- This addresses the "RLS Enabled No Policy" security issue

-- 2. Restrict encryption keys access - users should only see keys they need
DROP POLICY IF EXISTS "users_can_view_others_public_keys" ON user_encryption_keys;

CREATE POLICY "users_can_view_own_keys"
ON user_encryption_keys
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "users_can_view_recipient_keys"
ON user_encryption_keys
FOR SELECT
TO authenticated
USING (
  -- Users can view keys for people they are messaging with
  EXISTS (
    SELECT 1 FROM chats
    WHERE (sender_id = auth.uid() AND recipient_id = user_encryption_keys.user_id)
    OR (recipient_id = auth.uid() AND sender_id = user_encryption_keys.user_id)
  )
);

-- 3. Improve public_doctor_profiles policy to hide sensitive IDs
-- Remove the overly permissive system policy
DROP POLICY IF EXISTS "System can manage doctor profiles" ON public_doctor_profiles;

-- Add proper admin-only management policy
CREATE POLICY "Admins can manage doctor profiles"
ON public_doctor_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 4. Add stricter validation for system operation tables
-- Require service role for monitoring logs
DROP POLICY IF EXISTS "System can insert monitoring logs" ON monitoring_logs;

CREATE POLICY "Service role can insert monitoring logs"
ON monitoring_logs
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow inserts from service role or admin users
  auth.jwt()->>'role' = 'service_role'
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Require service role for audit logs
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

CREATE POLICY "Service role can insert audit logs"
ON audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 5. Improve emergency_flags policies
DROP POLICY IF EXISTS "System can insert emergency flags" ON emergency_flags;

CREATE POLICY "Service role can manage emergency flags"
ON emergency_flags
FOR ALL
TO authenticated
USING (
  auth.jwt()->>'role' = 'service_role'
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 6. Add policies for ai_confidence_logs
DROP POLICY IF EXISTS "System can insert AI confidence logs" ON ai_confidence_logs;

CREATE POLICY "Service role can manage AI logs"
ON ai_confidence_logs
FOR ALL
TO authenticated
USING (
  auth.jwt()->>'role' = 'service_role'
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 7. Improve blog_posts policies - only admins can create/update
DROP POLICY IF EXISTS "Anyone can create blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Anyone can update blog posts" ON blog_posts;

CREATE POLICY "Admins can create blog posts"
ON blog_posts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update blog posts"
ON blog_posts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete blog posts"
ON blog_posts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 8. Add rate limiting table policies
CREATE POLICY "Users can view own rate limits"
ON api_rate_limits_enhanced
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can manage rate limits"
ON api_rate_limits_enhanced
FOR ALL
TO authenticated
USING (
  auth.jwt()->>'role' = 'service_role'
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 9. Secure herbal consultations - patients and practitioners only
CREATE POLICY "Users can view own consultations"
ON herbal_consultations
FOR SELECT
TO authenticated
USING (
  patient_id = auth.uid()
  OR practitioner_id IN (
    SELECT id FROM herbal_practitioners WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Patients can book consultations"
ON herbal_consultations
FOR INSERT
TO authenticated
WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Practitioners can update own consultations"
ON herbal_consultations
FOR UPDATE
TO authenticated
USING (
  practitioner_id IN (
    SELECT id FROM herbal_practitioners WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  practitioner_id IN (
    SELECT id FROM herbal_practitioners WHERE user_id = auth.uid()
  )
);

-- 10. Add security for call_sessions table
CREATE POLICY "Users can view own call sessions"
ON call_sessions
FOR SELECT
TO authenticated
USING (
  patient_id = auth.uid() OR doctor_id = auth.uid()
);

CREATE POLICY "Users can create own call sessions"
ON call_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  patient_id = auth.uid() OR doctor_id = auth.uid()
);

CREATE POLICY "Users can update own call sessions"
ON call_sessions
FOR UPDATE
TO authenticated
USING (
  patient_id = auth.uid() OR doctor_id = auth.uid()
)
WITH CHECK (
  patient_id = auth.uid() OR doctor_id = auth.uid()
);

-- 11. Add security comments for documentation
COMMENT ON POLICY "users_can_view_own_keys" ON user_encryption_keys IS 
  'Users can only view their own encryption keys';

COMMENT ON POLICY "users_can_view_recipient_keys" ON user_encryption_keys IS 
  'Users can view encryption keys only for people they are actively messaging';

COMMENT ON POLICY "Service role can insert monitoring logs" ON monitoring_logs IS 
  'Only service role and admins can insert monitoring logs to prevent log injection attacks';

COMMENT ON POLICY "Service role can manage emergency flags" ON emergency_flags IS 
  'Restricts emergency flag creation to service role and admins only';