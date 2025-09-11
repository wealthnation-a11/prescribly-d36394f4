-- Create diagnosis_sessions table for System Assessment
CREATE TABLE IF NOT EXISTS public.diagnosis_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  symptoms_text TEXT,
  selected_symptoms JSONB DEFAULT '[]'::jsonb,
  ai_diagnoses JSONB DEFAULT '[]'::jsonb,
  suggested_drugs JSONB DEFAULT '[]'::jsonb,
  doctor_review_status TEXT DEFAULT 'pending' CHECK (doctor_review_status IN ('pending', 'approved', 'modified', 'rejected')),
  doctor_id UUID,
  doctor_notes TEXT,
  final_prescription_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diagnosis_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Patients can view their own diagnosis sessions" 
ON public.diagnosis_sessions 
FOR SELECT 
USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create their own diagnosis sessions" 
ON public.diagnosis_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their own diagnosis sessions" 
ON public.diagnosis_sessions 
FOR UPDATE 
USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view diagnosis sessions for review" 
ON public.diagnosis_sessions 
FOR SELECT 
USING (has_role(auth.uid(), 'doctor'::user_role) AND doctor_review_status = 'pending');

CREATE POLICY "Doctors can update diagnosis sessions for review" 
ON public.diagnosis_sessions 
FOR UPDATE 
USING (has_role(auth.uid(), 'doctor'::user_role) AND (doctor_review_status = 'pending' OR auth.uid() = doctor_id));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_diagnosis_sessions_updated_at
BEFORE UPDATE ON public.diagnosis_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();