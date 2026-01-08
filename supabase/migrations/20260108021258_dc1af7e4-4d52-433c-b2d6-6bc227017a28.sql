-- Fix overly permissive RLS INSERT policies on audit tables

-- Fix ai_confidence_logs INSERT policy
DROP POLICY IF EXISTS "System can create confidence logs" ON ai_confidence_logs;
CREATE POLICY "Authenticated users can create confidence logs"
ON ai_confidence_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix call_logs INSERT policy
DROP POLICY IF EXISTS "System can create call logs" ON call_logs;
CREATE POLICY "Authenticated users can create call logs"
ON call_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix call_logs UPDATE policy
DROP POLICY IF EXISTS "System can update call logs" ON call_logs;
CREATE POLICY "Participants can update their call logs"
ON call_logs FOR UPDATE
USING (auth.uid() = doctor_id OR auth.uid() = patient_id);

-- Fix doctor_overrides INSERT policy
DROP POLICY IF EXISTS "System can create doctor overrides" ON doctor_overrides;
CREATE POLICY "Authenticated users can create doctor overrides"
ON doctor_overrides FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix emergency_flags INSERT policy
DROP POLICY IF EXISTS "System can create emergency flags" ON emergency_flags;
CREATE POLICY "Authenticated users can create emergency flags"
ON emergency_flags FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix security_audit INSERT policy (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_audit') THEN
    EXECUTE 'DROP POLICY IF EXISTS "System can create security audit logs" ON security_audit';
    EXECUTE 'CREATE POLICY "Authenticated users can create security audit logs" ON security_audit FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- Fix function search paths for security
ALTER FUNCTION doctor_has_active_appointment_with_patient(uuid, uuid) SET search_path = public;
ALTER FUNCTION has_role(uuid, user_role) SET search_path = public;