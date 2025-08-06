-- Create doctors_profile table for detailed doctor information
CREATE TABLE public.doctors_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  specialty TEXT,
  license_number TEXT,
  clinic_name TEXT,
  years_experience INTEGER,
  bio TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctors_profile ENABLE ROW LEVEL SECURITY;

-- Create policies for doctors_profile
CREATE POLICY "Doctors can view their own profile" 
ON public.doctors_profile 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Doctors can create their own profile" 
ON public.doctors_profile 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Doctors can update their own profile" 
ON public.doctors_profile 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create doctor_availability table for working hours
CREATE TABLE public.doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  weekday TEXT NOT NULL, -- 'monday', 'tuesday', etc.
  start_time TIME,
  end_time TIME,
  timezone TEXT DEFAULT 'Africa/Lagos',
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

-- Create policies for doctor_availability
CREATE POLICY "Doctors can view their own availability" 
ON public.doctor_availability 
FOR SELECT 
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can create their own availability" 
ON public.doctor_availability 
FOR INSERT 
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update their own availability" 
ON public.doctor_availability 
FOR UPDATE 
USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete their own availability" 
ON public.doctor_availability 
FOR DELETE 
USING (auth.uid() = doctor_id);

-- Create call_logs table for earnings tracking
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  call_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  patient_payment NUMERIC(10,2) DEFAULT 10.00,
  doctor_earnings NUMERIC(10,2) DEFAULT 8.00,
  admin_fee NUMERIC(10,2) DEFAULT 2.00,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for call_logs
CREATE POLICY "Doctors can view their own call logs" 
ON public.call_logs 
FOR SELECT 
USING (auth.uid() = doctor_id);

CREATE POLICY "Admins can view all call logs" 
ON public.call_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Add triggers for updated_at
CREATE TRIGGER update_doctors_profile_updated_at
BEFORE UPDATE ON public.doctors_profile
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_availability_updated_at
BEFORE UPDATE ON public.doctor_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();