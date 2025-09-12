-- Security and compliance enhancements for Diagnostic System

-- Add encryption for sensitive fields in diagnosis_sessions_v2
ALTER TABLE public.diagnosis_sessions_v2 
ADD COLUMN encrypted_symptoms BYTEA,
ADD COLUMN encrypted_conditions BYTEA,
ADD COLUMN encryption_key_id UUID;

-- Add encryption for sensitive fields in prescriptions_v2  
ALTER TABLE public.prescriptions_v2
ADD COLUMN encrypted_drugs BYTEA,
ADD COLUMN encryption_key_id UUID;

-- Add encryption audit table
CREATE TABLE public.encryption_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on encryption keys
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies for encryption keys - only users can access their own keys
CREATE POLICY "Users can view their own encryption keys"
  ON public.encryption_keys
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own encryption keys"
  ON public.encryption_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add rate limiting table
CREATE TABLE public.api_rate_limits_enhanced (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint, window_start)
);

-- Enable RLS on rate limits
ALTER TABLE public.api_rate_limits_enhanced ENABLE ROW LEVEL SECURITY;

-- RLS policy for rate limits
CREATE POLICY "Users can view their own rate limits"
  ON public.api_rate_limits_enhanced
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert rate limits"
  ON public.api_rate_limits_enhanced
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update rate limits"
  ON public.api_rate_limits_enhanced
  FOR UPDATE
  USING (true);

-- Add emergency flags table
CREATE TABLE public.emergency_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diagnosis_session_id UUID NOT NULL,
  flag_type TEXT NOT NULL,
  severity_level INTEGER NOT NULL CHECK (severity_level BETWEEN 1 AND 5),
  description TEXT NOT NULL,
  action_required TEXT NOT NULL,
  flagged_by TEXT NOT NULL CHECK (flagged_by IN ('ai', 'doctor', 'system')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

-- Enable RLS on emergency flags
ALTER TABLE public.emergency_flags ENABLE ROW LEVEL SECURITY;

-- RLS policies for emergency flags
CREATE POLICY "Users can view emergency flags for their sessions"
  ON public.emergency_flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.diagnosis_sessions_v2 ds
      WHERE ds.id = emergency_flags.diagnosis_session_id
      AND ds.user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can view emergency flags for assigned sessions"
  ON public.emergency_flags
  FOR SELECT
  USING (
    has_role(auth.uid(), 'doctor'::user_role) AND
    EXISTS (
      SELECT 1 FROM public.diagnosis_sessions_v2 ds
      WHERE ds.id = emergency_flags.diagnosis_session_id
      AND ds.status = 'pending'
    )
  );

CREATE POLICY "Admins can view all emergency flags"
  ON public.emergency_flags
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can create emergency flags"
  ON public.emergency_flags
  FOR INSERT
  WITH CHECK (true);

-- Add security audit table for compliance
CREATE TABLE public.security_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  endpoint TEXT NOT NULL,
  request_method TEXT,
  request_payload JSONB,
  response_status INTEGER,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on security audit
ALTER TABLE public.security_audit ENABLE ROW LEVEL SECURITY;

-- RLS policies for security audit - only admins can view
CREATE POLICY "Admins can view all security audit logs"
  ON public.security_audit
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can create security audit logs"
  ON public.security_audit
  FOR INSERT
  WITH CHECK (true);

-- Create function for input sanitization
CREATE OR REPLACE FUNCTION public.sanitize_input(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove potentially harmful characters and patterns
  input_text := regexp_replace(input_text, '[<>"\'';&]', '', 'g');
  -- Limit length to prevent buffer overflow attacks
  input_text := substring(input_text, 1, 10000);
  RETURN TRIM(input_text);
END;
$$;

-- Create function to check emergency symptoms
CREATE OR REPLACE FUNCTION public.check_emergency_symptoms(symptoms TEXT[])
RETURNS TABLE(is_emergency BOOLEAN, flags TEXT[], severity INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emergency_keywords TEXT[] := ARRAY[
    'chest pain', 'heart attack', 'stroke', 'breathing difficulty', 
    'severe bleeding', 'unconscious', 'seizure', 'severe allergic reaction',
    'poisoning', 'overdose', 'severe burns', 'broken bones'
  ];
  symptom TEXT;
  keyword TEXT;
  flag_list TEXT[] := ARRAY[]::TEXT[];
  emergency_found BOOLEAN := FALSE;
  max_severity INTEGER := 1;
BEGIN
  FOREACH symptom IN ARRAY symptoms LOOP
    FOREACH keyword IN ARRAY emergency_keywords LOOP
      IF LOWER(symptom) LIKE '%' || keyword || '%' THEN
        emergency_found := TRUE;
        flag_list := array_append(flag_list, keyword);
        max_severity := GREATEST(max_severity, 5);
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT emergency_found, flag_list, max_severity;
END;
$$;

-- Create function for rate limiting check
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  user_uuid UUID, 
  endpoint_name TEXT, 
  max_requests INTEGER DEFAULT 10,
  window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start_time := date_trunc('hour', now()) + 
    (EXTRACT(MINUTE FROM now())::INTEGER / window_minutes) * (window_minutes || ' minutes')::INTERVAL;
  
  -- Get current count for this user/endpoint/window
  SELECT COALESCE(request_count, 0) INTO current_count
  FROM public.api_rate_limits_enhanced
  WHERE user_id = user_uuid 
    AND endpoint = endpoint_name
    AND window_start = window_start_time;
  
  -- If over limit, return false
  IF current_count >= max_requests THEN
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

-- Enhanced RLS policies for diagnosis_sessions_v2
DROP POLICY IF EXISTS "Users can view their own diagnosis sessions" ON public.diagnosis_sessions_v2;
DROP POLICY IF EXISTS "Doctors can view diagnosis sessions for review" ON public.diagnosis_sessions_v2;
DROP POLICY IF EXISTS "Admins can view all diagnosis sessions" ON public.diagnosis_sessions_v2;

CREATE POLICY "Patients can view their own diagnosis sessions"
  ON public.diagnosis_sessions_v2
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view assigned diagnosis sessions"
  ON public.diagnosis_sessions_v2
  FOR SELECT
  USING (
    has_role(auth.uid(), 'doctor'::user_role) AND
    (status = 'pending' OR 
     EXISTS (
       SELECT 1 FROM public.prescriptions_v2 p
       WHERE p.diagnosis_id = diagnosis_sessions_v2.id
       AND p.doctor_id = auth.uid()
     ))
  );

CREATE POLICY "Admins can view all diagnosis sessions"
  ON public.diagnosis_sessions_v2
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Enhanced RLS policies for prescriptions_v2
DROP POLICY IF EXISTS "Users can view their own prescriptions" ON public.prescriptions_v2;
DROP POLICY IF EXISTS "Doctors can create prescriptions" ON public.prescriptions_v2;
DROP POLICY IF EXISTS "Admins can view all prescriptions" ON public.prescriptions_v2;

CREATE POLICY "Patients can view their own prescriptions"
  ON public.prescriptions_v2
  FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view their prescribed prescriptions"
  ON public.prescriptions_v2
  FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can create prescriptions for assigned sessions"
  ON public.prescriptions_v2
  FOR INSERT
  WITH CHECK (
    auth.uid() = doctor_id AND
    has_role(auth.uid(), 'doctor'::user_role) AND
    EXISTS (
      SELECT 1 FROM public.diagnosis_sessions_v2 ds
      WHERE ds.id = diagnosis_id
      AND ds.status = 'pending'
    )
  );

CREATE POLICY "Admins can view all prescriptions"
  ON public.prescriptions_v2
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Make audit_logs immutable (no updates allowed)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE policies for audit_logs to ensure immutability