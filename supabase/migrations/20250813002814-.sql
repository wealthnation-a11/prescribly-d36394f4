-- Create patient_visits table to store symptom entries, AI results, and prescription linkage
CREATE TABLE IF NOT EXISTS public.patient_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  symptom_text text,
  selected_symptoms text[],
  clarifying_qna jsonb, -- array of {question, answer, timestamp}
  ai_differential jsonb, -- array of {diagnosis, icd10, confidence}
  final_diagnosis text,
  icd10_code text,
  status text NOT NULL DEFAULT 'in_progress', -- in_progress | diagnosis_complete | prescription_generated | review_required | failed
  safety_flags jsonb, -- e.g., {allergy_match: true, interactions: [...]} 
  prescription_id uuid, -- references prescriptions.id when generated
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on patient_visits
ALTER TABLE public.patient_visits ENABLE ROW LEVEL SECURITY;

-- Policies for patient_visits
-- Patients can insert their own visits
CREATE POLICY "Patients can create their own visits"
ON public.patient_visits
FOR INSERT
WITH CHECK (auth.uid() = patient_id);

-- Patients can view their own visits
CREATE POLICY "Patients can view their own visits"
ON public.patient_visits
FOR SELECT
USING (auth.uid() = patient_id);

-- Patients can update their own visits
CREATE POLICY "Patients can update their own visits"
ON public.patient_visits
FOR UPDATE
USING (auth.uid() = patient_id);

-- Doctors can view visits that require review
CREATE POLICY "Doctors can view visits requiring review"
ON public.patient_visits
FOR SELECT
USING (has_role(auth.uid(), 'doctor'::user_role) AND status = 'review_required');

-- Admins can view all visits
CREATE POLICY "Admins can view all visits"
ON public.patient_visits
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Admins can update all visits
CREATE POLICY "Admins can update all visits"
ON public.patient_visits
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role));

-- Indexes for patient_visits
CREATE INDEX IF NOT EXISTS idx_patient_visits_patient ON public.patient_visits (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_status ON public.patient_visits (status);
CREATE INDEX IF NOT EXISTS idx_patient_visits_icd10 ON public.patient_visits (icd10_code);
CREATE INDEX IF NOT EXISTS idx_patient_visits_created_at ON public.patient_visits (created_at);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trg_patient_visits_updated_at ON public.patient_visits;
CREATE TRIGGER trg_patient_visits_updated_at
BEFORE UPDATE ON public.patient_visits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create approved_medications to store standing order protocols
CREATE TABLE IF NOT EXISTS public.approved_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_name text NOT NULL,
  icd10_code text NOT NULL,
  protocol jsonb NOT NULL, -- {medications: [{name, rxnorm_name?, dose, route, frequency, duration}], inclusion: {...}, exclusion: {...}, instructions}
  active boolean NOT NULL DEFAULT true,
  notes text,
  last_reviewed_by uuid, -- user_id of reviewer (doctor/admin)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on approved_medications
ALTER TABLE public.approved_medications ENABLE ROW LEVEL SECURITY;

-- Doctors and Admins can view protocols
CREATE POLICY "Clinicians can view protocols"
ON public.approved_medications
FOR SELECT
USING (has_role(auth.uid(), 'doctor'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- Admins can create protocols
CREATE POLICY "Admins can create protocols"
ON public.approved_medications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Admins and Doctors can update protocols
CREATE POLICY "Clinicians can update protocols"
ON public.approved_medications
FOR UPDATE
USING (has_role(auth.uid(), 'doctor'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- Indexes for approved_medications
CREATE INDEX IF NOT EXISTS idx_approved_meds_icd10 ON public.approved_medications (icd10_code);
CREATE INDEX IF NOT EXISTS idx_approved_meds_active ON public.approved_medications (active);

-- Trigger to auto-update updated_at for approved_medications
DROP TRIGGER IF EXISTS trg_approved_medications_updated_at ON public.approved_medications;
CREATE TRIGGER trg_approved_medications_updated_at
BEFORE UPDATE ON public.approved_medications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();