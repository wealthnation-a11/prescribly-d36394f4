-- Create herbal practitioners table
CREATE TABLE IF NOT EXISTS public.herbal_practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  specialization TEXT NOT NULL,
  years_of_experience INTEGER,
  bio TEXT,
  qualifications JSONB,
  license_number TEXT,
  practice_location TEXT,
  verification_status public.verification_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.herbal_practitioners ENABLE ROW LEVEL SECURITY;

-- Policies for herbal practitioners
CREATE POLICY "Users can create their herbal practitioner profile"
  ON public.herbal_practitioners
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Practitioners can view their own profile"
  ON public.herbal_practitioners
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Practitioners can update their own profile"
  ON public.herbal_practitioners
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all herbal practitioners"
  ON public.herbal_practitioners
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update all herbal practitioners"
  ON public.herbal_practitioners
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create audit table for verification actions
CREATE TABLE IF NOT EXISTS public.herbal_verification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.herbal_practitioners(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.herbal_verification_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view verification audit"
  ON public.herbal_verification_audit
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can insert verification audit"
  ON public.herbal_verification_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (true);