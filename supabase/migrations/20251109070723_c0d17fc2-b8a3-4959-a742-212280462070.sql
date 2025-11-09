-- Add country field to profiles, patients, and doctors tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS country TEXT;

-- Create index for better performance on country queries
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);
CREATE INDEX IF NOT EXISTS idx_patients_country ON public.patients(country);