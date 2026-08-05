
CREATE TABLE IF NOT EXISTS public.patient_record_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  session_id uuid REFERENCES public.consultation_sessions(id) ON DELETE SET NULL,
  appointment_id uuid,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  notes text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint,
  uploaded_by uuid NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_record_files TO authenticated;
GRANT ALL ON public.patient_record_files TO service_role;

ALTER TABLE public.patient_record_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prf_admin_all" ON public.patient_record_files
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "prf_patient_select" ON public.patient_record_files
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "prf_doctor_select" ON public.patient_record_files
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.consultation_sessions cs
    WHERE cs.patient_id = patient_record_files.patient_id
      AND cs.doctor_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_prf_patient ON public.patient_record_files(patient_id);
CREATE INDEX IF NOT EXISTS idx_prf_session ON public.patient_record_files(session_id);

CREATE TRIGGER trg_prf_updated BEFORE UPDATE ON public.patient_record_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Approved doctors can see and claim unassigned consultation requests
CREATE POLICY "cs_doctor_select_unassigned" ON public.consultation_sessions
  FOR SELECT TO authenticated
  USING (
    doctor_id IS NULL
    AND status IN ('waiting','scheduled','paid','active')
    AND EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.user_id = auth.uid() AND d.verification_status = 'approved'
    )
  );

CREATE POLICY "cs_doctor_claim" ON public.consultation_sessions
  FOR UPDATE TO authenticated
  USING (
    doctor_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.user_id = auth.uid() AND d.verification_status = 'approved'
    )
  )
  WITH CHECK (doctor_id = auth.uid());
