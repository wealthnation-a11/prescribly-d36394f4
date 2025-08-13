-- Fix policy existence checks and create patient_prescriptions table + RLS
CREATE TABLE IF NOT EXISTS public.patient_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  medications JSONB NOT NULL,
  diagnosis JSONB,
  status TEXT NOT NULL DEFAULT 'generated',
  safety_flags JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_patient_prescriptions_patient_id ON public.patient_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_prescriptions_visit_id ON public.patient_prescriptions(visit_id);
CREATE INDEX IF NOT EXISTS idx_patient_prescriptions_status ON public.patient_prescriptions(status);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Patients can create their own generated prescriptions'
      AND tablename = 'patient_prescriptions'
      AND schemaname = 'public'
  ) THEN
    CREATE POLICY "Patients can create their own generated prescriptions"
    ON public.patient_prescriptions
    FOR INSERT
    WITH CHECK (auth.uid() = patient_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Patients can view their own prescriptions'
      AND tablename = 'patient_prescriptions'
      AND schemaname = 'public'
  ) THEN
    CREATE POLICY "Patients can view their own prescriptions"
    ON public.patient_prescriptions
    FOR SELECT
    USING (auth.uid() = patient_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Doctors can view prescriptions requiring review'
      AND tablename = 'patient_prescriptions'
      AND schemaname = 'public'
  ) THEN
    CREATE POLICY "Doctors can view prescriptions requiring review"
    ON public.patient_prescriptions
    FOR SELECT
    USING (has_role(auth.uid(), 'doctor'::user_role) AND status = 'needs_review');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can view all patient prescriptions'
      AND tablename = 'patient_prescriptions'
      AND schemaname = 'public'
  ) THEN
    CREATE POLICY "Admins can view all patient prescriptions"
    ON public.patient_prescriptions
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::user_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can update all patient prescriptions'
      AND tablename = 'patient_prescriptions'
      AND schemaname = 'public'
  ) THEN
    CREATE POLICY "Admins can update all patient prescriptions"
    ON public.patient_prescriptions
    FOR UPDATE
    USING (has_role(auth.uid(), 'admin'::user_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tg_update_patient_prescriptions_updated_at'
  ) THEN
    CREATE TRIGGER tg_update_patient_prescriptions_updated_at
    BEFORE UPDATE ON public.patient_prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;