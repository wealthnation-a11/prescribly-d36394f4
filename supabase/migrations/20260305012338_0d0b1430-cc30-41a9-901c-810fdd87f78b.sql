CREATE TABLE public.doctor_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(appointment_id, patient_id)
);

ALTER TABLE public.doctor_reviews ENABLE ROW LEVEL SECURITY;

-- Patients can insert their own reviews
CREATE POLICY "Patients can insert own reviews"
ON public.doctor_reviews FOR INSERT TO authenticated
WITH CHECK (auth.uid() = patient_id);

-- Patients can read their own reviews
CREATE POLICY "Patients can read own reviews"
ON public.doctor_reviews FOR SELECT TO authenticated
USING (auth.uid() = patient_id);

-- Doctors can read reviews about them
CREATE POLICY "Doctors can read their reviews"
ON public.doctor_reviews FOR SELECT TO authenticated
USING (auth.uid() = doctor_id);

-- Admins can read all reviews
CREATE POLICY "Admins can read all reviews"
ON public.doctor_reviews FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));