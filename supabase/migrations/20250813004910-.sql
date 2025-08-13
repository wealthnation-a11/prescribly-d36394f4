-- Allow doctors to approve or reject AI-generated prescriptions that require review
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'patient_prescriptions' 
      AND policyname = 'Doctors can update prescriptions requiring review'
  ) THEN
    CREATE POLICY "Doctors can update prescriptions requiring review"
    ON public.patient_prescriptions
    FOR UPDATE
    USING (has_role(auth.uid(), 'doctor'::user_role) AND status = 'needs_review')
    WITH CHECK (has_role(auth.uid(), 'doctor'::user_role));
  END IF;
END $$;