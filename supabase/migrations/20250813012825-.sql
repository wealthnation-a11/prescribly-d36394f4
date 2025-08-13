-- Add pregnancy_status to patients
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS pregnancy_status boolean;