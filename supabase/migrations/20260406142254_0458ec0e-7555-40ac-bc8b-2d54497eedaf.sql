
-- Add home visit reviews table
CREATE TABLE IF NOT EXISTS public.home_visit_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  home_visit_request_id uuid REFERENCES public.home_visit_requests(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.home_visit_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hvr_patient_ins" ON public.home_visit_reviews FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "hvr_patient_sel" ON public.home_visit_reviews FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "hvr_doctor_sel" ON public.home_visit_reviews FOR SELECT USING (auth.uid() = doctor_id);
CREATE POLICY "hvr_admin" ON public.home_visit_reviews FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin_notes to hospital_registrations
ALTER TABLE public.hospital_registrations ADD COLUMN IF NOT EXISTS admin_notes text;
