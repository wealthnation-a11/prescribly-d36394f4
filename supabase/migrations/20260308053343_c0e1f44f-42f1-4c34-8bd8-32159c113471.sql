
-- Create hospital registration status type
DO $$ BEGIN
  CREATE TYPE public.hospital_registration_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create hospital_registrations table
CREATE TABLE IF NOT EXISTS public.hospital_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'hospital',
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  contact_person TEXT,
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  logo_url TEXT,
  status public.hospital_registration_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hospital_registrations ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert
CREATE POLICY "Authenticated users can submit hospital registrations"
  ON public.hospital_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can view all
CREATE POLICY "Admins can view all hospital registrations"
  ON public.hospital_registrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update
CREATE POLICY "Admins can update hospital registrations"
  ON public.hospital_registrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own submissions
CREATE POLICY "Users can view own hospital registrations"
  ON public.hospital_registrations
  FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());
