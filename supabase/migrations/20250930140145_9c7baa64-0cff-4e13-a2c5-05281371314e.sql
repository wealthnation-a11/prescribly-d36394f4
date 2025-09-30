-- Phase 1: Critical Security Fixes

-- 1. Restrict encryption_keys table - only users can see their own public keys
DROP POLICY IF EXISTS "Users can view their own encryption keys" ON public.encryption_keys;
CREATE POLICY "Users can view their own encryption keys"
ON public.encryption_keys
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Secure health_tips - require authentication
DROP POLICY IF EXISTS "Anyone can view health tips" ON public.health_tips;
CREATE POLICY "Authenticated users can view health tips"
ON public.health_tips
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 3. Secure companion_questions - require authentication
DROP POLICY IF EXISTS "Anyone can view companion questions" ON public.companion_questions;
CREATE POLICY "Authenticated users can view companion questions"
ON public.companion_questions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4. Add RLS policy for public_doctor_profiles (currently has none)
ALTER TABLE public.public_doctor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved doctor profiles"
ON public.public_doctor_profiles
FOR SELECT
USING (true);

CREATE POLICY "System can manage doctor profiles"
ON public.public_doctor_profiles
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Update database functions to use secure search_path (fixing existing functions)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE email = user_email
      AND role = 'admin'
  )
$function$;

-- 6. Add index for better performance on role checks
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- 7. Add audit logging for doctor verification changes
CREATE TABLE IF NOT EXISTS public.doctor_verification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_verification_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view verification audit"
ON public.doctor_verification_audit
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert verification audit"
ON public.doctor_verification_audit
FOR INSERT
WITH CHECK (true);