-- ============================================
-- FIX: appointments table - Restrict to patient/doctor/admin only
-- ============================================

-- Drop existing overly permissive SELECT policies
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors can view assigned appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow patient/doctor/admin to view appointments" ON public.appointments;

-- Create secure policy: only patient, doctor, or admin can view
CREATE POLICY "Allow patient/doctor/admin to view appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
    patient_id = auth.uid()
    OR doctor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
);

-- ============================================
-- FIX: profiles table - Deny anonymous, restrict to own profile
-- ============================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Deny anonymous access completely
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Authenticated users can only view their own profile (or admin can view all)
CREATE POLICY "Users can view own profile or admin views all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
);