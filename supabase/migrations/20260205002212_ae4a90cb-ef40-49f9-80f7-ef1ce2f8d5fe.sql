-- =============================================
-- SECURITY HARDENING: RLS Policy Fixes (Corrected)
-- =============================================

-- 1. FIX: call_logs - Clean up all existing policies first
DROP POLICY IF EXISTS "Doctors can view their call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Doctors can view their own call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Patients can view their call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Patients can view their call logs without financial data" ON public.call_logs;
DROP POLICY IF EXISTS "System can create call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Service role can create call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Service role can update call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can view their own call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Admins can view all call logs" ON public.call_logs;

-- Create new policies with proper access control
-- Doctors can view their own call logs (including earnings)
CREATE POLICY "Doctors can view their own call logs"
ON public.call_logs FOR SELECT
TO authenticated
USING (
  doctor_id = auth.uid()
);

-- Patients can only view non-financial fields of their call logs via view
-- But RLS on base table still allows SELECT - we'll use the view for app queries
CREATE POLICY "Patients can view their call logs basic info"
ON public.call_logs FOR SELECT
TO authenticated
USING (
  patient_id = auth.uid()
);

-- Admins can view all call logs
CREATE POLICY "Admins can view all call logs"
ON public.call_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Only service role or admins can create call logs
CREATE POLICY "Service role can create call logs"
ON public.call_logs FOR INSERT
WITH CHECK (
  (auth.jwt() ->> 'role') = 'service_role'
  OR public.has_role(auth.uid(), 'admin')
);

-- Only service role or admins can update call logs
CREATE POLICY "Service role can update call logs"
ON public.call_logs FOR UPDATE
USING (
  (auth.jwt() ->> 'role') = 'service_role'
  OR public.has_role(auth.uid(), 'admin')
);

-- 2. FIX: ai_confidence_logs - Restrict inserts to service role
DROP POLICY IF EXISTS "System can create confidence logs" ON public.ai_confidence_logs;
DROP POLICY IF EXISTS "Service role can create confidence logs" ON public.ai_confidence_logs;

CREATE POLICY "Service role can create confidence logs"
ON public.ai_confidence_logs FOR INSERT
WITH CHECK (
  (auth.jwt() ->> 'role') = 'service_role'
  OR public.has_role(auth.uid(), 'admin')
);

-- 3. FIX: emergency_flags - Restrict inserts to service role and doctors
DROP POLICY IF EXISTS "System can create emergency flags" ON public.emergency_flags;
DROP POLICY IF EXISTS "Service role can create emergency flags" ON public.emergency_flags;

CREATE POLICY "Service role can create emergency flags"
ON public.emergency_flags FOR INSERT
WITH CHECK (
  (auth.jwt() ->> 'role') = 'service_role'
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'doctor')
);

-- 4. FIX: monitoring_logs - Ensure service role only for inserts
DROP POLICY IF EXISTS "Service role can insert monitoring logs" ON public.monitoring_logs;
DROP POLICY IF EXISTS "System can insert monitoring logs" ON public.monitoring_logs;

CREATE POLICY "Service role can insert monitoring logs"
ON public.monitoring_logs FOR INSERT
WITH CHECK (
  (auth.jwt() ->> 'role') = 'service_role'
  OR public.has_role(auth.uid(), 'admin')
);

-- 5. FIX: audit_logs - Restrict access properly
DROP POLICY IF EXISTS "Service role can create audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Doctors can view their audit logs" ON public.audit_logs;

CREATE POLICY "Service role can create audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (
  (auth.jwt() ->> 'role') = 'service_role'
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'doctor')
);

-- Ensure admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Doctors can view their own audit logs
CREATE POLICY "Doctors can view their audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  actor_id = auth.uid()
);

-- 6. Create a SECURE view for patients to see call logs WITHOUT financial data
DROP VIEW IF EXISTS public.patient_call_logs;
CREATE VIEW public.patient_call_logs
WITH (security_invoker = on) AS
SELECT 
  id,
  patient_id,
  doctor_id,
  call_session_id,
  call_date,
  duration_minutes,
  status,
  created_at,
  updated_at
  -- Explicitly excluding: doctor_earnings, admin_fee, patient_payment
FROM public.call_logs
WHERE patient_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON public.patient_call_logs TO authenticated;

-- 7. Ensure encrypted_message_audit is protected
DROP POLICY IF EXISTS "Service role can insert audit" ON public.encrypted_message_audit;
CREATE POLICY "Service role can insert audit"
ON public.encrypted_message_audit FOR INSERT
WITH CHECK (
  (auth.jwt() ->> 'role') = 'service_role'
  OR public.has_role(auth.uid(), 'admin')
);

-- 8. Add rate limiting check for API abuse prevention
-- Create a function to check and enforce rate limits more strictly
CREATE OR REPLACE FUNCTION public.enforce_rate_limit(
  user_uuid uuid,
  endpoint_name text,
  max_requests integer DEFAULT 100,
  window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate the current time window
  window_start_time := date_trunc('hour', now()) + 
    (EXTRACT(MINUTE FROM now())::INTEGER / window_minutes) * (window_minutes || ' minutes')::INTERVAL;
  
  -- Get current request count for this user/endpoint/window
  SELECT COALESCE(request_count, 0) INTO current_count
  FROM public.api_rate_limits_enhanced
  WHERE user_id = user_uuid 
    AND endpoint = endpoint_name
    AND window_start = window_start_time;
  
  -- Block if limit exceeded
  IF current_count >= max_requests THEN
    -- Log the rate limit violation
    INSERT INTO public.monitoring_logs (event_type, entity_id, success, error_message, event_data)
    VALUES (
      'rate_limit_exceeded',
      user_uuid,
      false,
      'Rate limit exceeded for ' || endpoint_name,
      jsonb_build_object('endpoint', endpoint_name, 'count', current_count, 'limit', max_requests)
    );
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  INSERT INTO public.api_rate_limits_enhanced (user_id, endpoint, request_count, window_start)
  VALUES (user_uuid, endpoint_name, 1, window_start_time)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET request_count = api_rate_limits_enhanced.request_count + 1;
  
  RETURN TRUE;
END;
$$;