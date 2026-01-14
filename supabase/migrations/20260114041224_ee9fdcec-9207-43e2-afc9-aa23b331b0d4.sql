-- ============================================
-- SECURITY TIGHTENING MIGRATION - Part 2
-- Fix remaining overly permissive RLS policies
-- ============================================

-- 1. Fix api_rate_limits policies  
DROP POLICY IF EXISTS "Service can insert rate limits" ON public.api_rate_limits;
DROP POLICY IF EXISTS "Service can update rate limits" ON public.api_rate_limits;

CREATE POLICY "Service role can insert rate limits"
ON public.api_rate_limits
FOR INSERT
WITH CHECK (
  ((auth.jwt() ->> 'role') = 'service_role') OR 
  has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Service role can update rate limits"
ON public.api_rate_limits
FOR UPDATE
USING (
  ((auth.jwt() ->> 'role') = 'service_role') OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- 2. Fix api_rate_limits_enhanced policies
DROP POLICY IF EXISTS "Service can insert rate limits" ON public.api_rate_limits_enhanced;
DROP POLICY IF EXISTS "Service can update rate limits" ON public.api_rate_limits_enhanced;

CREATE POLICY "Service role can insert rate limits enhanced"
ON public.api_rate_limits_enhanced
FOR INSERT
WITH CHECK (
  ((auth.jwt() ->> 'role') = 'service_role') OR 
  has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Service role can update rate limits enhanced"
ON public.api_rate_limits_enhanced
FOR UPDATE
USING (
  ((auth.jwt() ->> 'role') = 'service_role') OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- 3. Fix daily_tips INSERT policy
DROP POLICY IF EXISTS "Service can insert daily tips" ON public.daily_tips;

CREATE POLICY "Service role can insert daily tips"
ON public.daily_tips
FOR INSERT
WITH CHECK (
  ((auth.jwt() ->> 'role') = 'service_role') OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- 4. Fix doctor_verification_audit INSERT policy
DROP POLICY IF EXISTS "System can insert verification audit" ON public.doctor_verification_audit;

CREATE POLICY "Service role can insert verification audit"
ON public.doctor_verification_audit
FOR INSERT
WITH CHECK (
  ((auth.jwt() ->> 'role') = 'service_role') OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- 5. Fix exchange_rates policies
DROP POLICY IF EXISTS "Service role can update exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Service role can insert exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Authenticated users can view exchange rates" ON public.exchange_rates;

CREATE POLICY "Service role can manage exchange rates"
ON public.exchange_rates
FOR ALL
USING (
  ((auth.jwt() ->> 'role') = 'service_role') OR 
  has_role(auth.uid(), 'admin'::user_role)
)
WITH CHECK (
  ((auth.jwt() ->> 'role') = 'service_role') OR 
  has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Authenticated users can view exchange rates safely"
ON public.exchange_rates
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 6. Fix herbal audit tables
DROP POLICY IF EXISTS "System can insert article audit" ON public.herbal_article_audit;
CREATE POLICY "Service role can insert article audit"
ON public.herbal_article_audit
FOR INSERT
WITH CHECK (
  ((auth.jwt() ->> 'role') = 'service_role') OR 
  has_role(auth.uid(), 'admin'::user_role)
);

DROP POLICY IF EXISTS "System can insert remedy audit" ON public.herbal_remedy_audit;
CREATE POLICY "Service role can insert remedy audit"
ON public.herbal_remedy_audit
FOR INSERT
WITH CHECK (
  ((auth.jwt() ->> 'role') = 'service_role') OR 
  has_role(auth.uid(), 'admin'::user_role)
);

DROP POLICY IF EXISTS "System can insert verification audit" ON public.herbal_verification_audit;
CREATE POLICY "Service role can insert herbal verification audit"
ON public.herbal_verification_audit
FOR INSERT
WITH CHECK (
  ((auth.jwt() ->> 'role') = 'service_role') OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- 7. Fix patient_data_access_log
DROP POLICY IF EXISTS "System can insert patient access logs" ON public.patient_data_access_log;
CREATE POLICY "Service role can insert patient access logs"
ON public.patient_data_access_log
FOR INSERT
WITH CHECK (
  ((auth.jwt() ->> 'role') = 'service_role') OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- 8. Fix performance_metrics
DROP POLICY IF EXISTS "System can create performance metrics" ON public.performance_metrics;
CREATE POLICY "Service role can create performance metrics"
ON public.performance_metrics
FOR INSERT
WITH CHECK (
  ((auth.jwt() ->> 'role') = 'service_role') OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- 9. Fix public_doctor_profiles - should only show approved doctors
DROP POLICY IF EXISTS "Anyone can view approved doctor profiles" ON public.public_doctor_profiles;
CREATE POLICY "Public can view approved doctor profiles"
ON public.public_doctor_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM doctors d 
    WHERE d.id = public_doctor_profiles.doctor_id 
    AND d.verification_status = 'approved'
  )
);

-- 10. Fix system_alerts
DROP POLICY IF EXISTS "System can create system alerts" ON public.system_alerts;
CREATE POLICY "Service role can create system alerts"
ON public.system_alerts
FOR INSERT
WITH CHECK (
  ((auth.jwt() ->> 'role') = 'service_role') OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- 11. Fix the 2 custom functions missing search_path
CREATE OR REPLACE FUNCTION public.log_call_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO audit_logs (actor_id, action, diagnosis_id, details)
  VALUES (
    NEW.patient_id,
    'call_' || NEW.status,
    NEW.id,
    jsonb_build_object(
      'doctor_id', NEW.doctor_id,
      'call_date', NEW.call_date,
      'duration_minutes', NEW.duration_minutes,
      'patient_payment', NEW.patient_payment,
      'doctor_earnings', NEW.doctor_earnings,
      'admin_fee', NEW.admin_fee
    )
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_call_monitoring()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO monitoring_logs (event_type, entity_id, success, event_data)
  VALUES (
    'call_' || NEW.status,
    NEW.id,
    true,
    jsonb_build_object(
      'doctor_id', NEW.doctor_id,
      'patient_id', NEW.patient_id,
      'call_date', NEW.call_date,
      'duration_minutes', NEW.duration_minutes,
      'payment', NEW.patient_payment
    )
  );
  RETURN NEW;
END;
$function$;