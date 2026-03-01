
-- =============================================
-- 1. Create pending_drug_approvals table
-- =============================================
CREATE TABLE public.pending_drug_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(user_id),
  diagnosis_session_id TEXT NOT NULL,
  condition_name TEXT NOT NULL,
  condition_id INTEGER,
  drugs JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_drugs JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  doctor_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_drug_approvals ENABLE ROW LEVEL SECURITY;

-- Patients can view their own pending approvals
CREATE POLICY "Patients can view own pending approvals"
  ON public.pending_drug_approvals FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

-- Doctors can view unassigned or their assigned pending approvals
CREATE POLICY "Doctors can view pending approvals"
  ON public.pending_drug_approvals FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor') AND (doctor_id IS NULL OR doctor_id = auth.uid())
  );

-- Doctors can update pending approvals (assign themselves, approve/reject)
CREATE POLICY "Doctors can update pending approvals"
  ON public.pending_drug_approvals FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'doctor') AND (doctor_id IS NULL OR doctor_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor')
  );

-- Authenticated users can insert (for edge functions via service role, or patient creating)
CREATE POLICY "Authenticated users can insert pending approvals"
  ON public.pending_drug_approvals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = patient_id);

-- Trigger for updated_at
CREATE TRIGGER update_pending_drug_approvals_updated_at
  BEFORE UPDATE ON public.pending_drug_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. Add home service columns to doctors
-- =============================================
ALTER TABLE public.doctors
  ADD COLUMN offers_home_service BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN home_service_fee NUMERIC,
  ADD COLUMN service_locations JSONB;

-- =============================================
-- 3. Add appointment_type and patient_address to appointments
-- =============================================
ALTER TABLE public.appointments
  ADD COLUMN appointment_type TEXT NOT NULL DEFAULT 'clinic',
  ADD COLUMN patient_address TEXT;

-- =============================================
-- 4. Add home service fields to public_doctor_profiles
-- =============================================
ALTER TABLE public.public_doctor_profiles
  ADD COLUMN offers_home_service BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN home_service_fee NUMERIC,
  ADD COLUMN service_locations JSONB;

-- =============================================
-- 5. Update refresh_public_doctor_profile function
-- =============================================
CREATE OR REPLACE FUNCTION public.refresh_public_doctor_profile(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  d RECORD;
  p RECORD;
BEGIN
  SELECT * INTO d FROM public.doctors WHERE user_id = _user_id;

  IF NOT FOUND THEN
    DELETE FROM public.public_doctor_profiles WHERE doctor_user_id = _user_id;
    RETURN;
  END IF;

  SELECT first_name, last_name, avatar_url INTO p FROM public.profiles WHERE user_id = _user_id;

  IF d.verification_status = 'approved' THEN
    INSERT INTO public.public_doctor_profiles AS pdp (
      doctor_id, doctor_user_id, first_name, last_name, specialization, bio, avatar_url, rating, total_reviews, years_of_experience, consultation_fee, offers_home_service, home_service_fee, service_locations, created_at, updated_at
    )
    VALUES (
      d.id, d.user_id, p.first_name, p.last_name, d.specialization, d.bio, p.avatar_url, d.rating, d.total_reviews, d.years_of_experience, d.consultation_fee, d.offers_home_service, d.home_service_fee, d.service_locations, now(), now()
    )
    ON CONFLICT (doctor_id) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        specialization = EXCLUDED.specialization,
        bio = EXCLUDED.bio,
        avatar_url = EXCLUDED.avatar_url,
        rating = EXCLUDED.rating,
        total_reviews = EXCLUDED.total_reviews,
        years_of_experience = EXCLUDED.years_of_experience,
        consultation_fee = EXCLUDED.consultation_fee,
        offers_home_service = EXCLUDED.offers_home_service,
        home_service_fee = EXCLUDED.home_service_fee,
        service_locations = EXCLUDED.service_locations,
        updated_at = now();
  ELSE
    DELETE FROM public.public_doctor_profiles WHERE doctor_user_id = _user_id;
  END IF;
END;
$function$;
