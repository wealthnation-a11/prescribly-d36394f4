
-- Facilities table (hospitals, clinics, pharmacies)
CREATE TABLE public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hospital', 'clinic', 'pharmacy')),
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  email TEXT,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Home visit requests with medical form data
CREATE TABLE public.home_visit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symptoms TEXT NOT NULL,
  illness_duration TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  urgency_level TEXT NOT NULL CHECK (urgency_level IN ('low', 'medium', 'high', 'emergency')),
  image_url TEXT,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'in_transit', 'completed', 'cancelled')),
  estimated_arrival TEXT,
  consultation_fee NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Registration codes for clinic/hospital/pharmacy visits
CREATE TABLE public.registration_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  qr_data TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add lat/lng to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- RLS for facilities (publicly readable)
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Facilities are publicly readable" ON public.facilities FOR SELECT USING (true);
CREATE POLICY "Only admins can manage facilities" ON public.facilities FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
) WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- RLS for home_visit_requests
ALTER TABLE public.home_visit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view own home visit requests" ON public.home_visit_requests FOR SELECT TO authenticated USING (auth.uid() = patient_id);
CREATE POLICY "Patients can create home visit requests" ON public.home_visit_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctors can view assigned home visit requests" ON public.home_visit_requests FOR SELECT TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "Doctors can update assigned home visit requests" ON public.home_visit_requests FOR UPDATE TO authenticated USING (auth.uid() = doctor_id);

-- RLS for registration_codes
ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view own registration codes" ON public.registration_codes FOR SELECT TO authenticated USING (auth.uid() = patient_id);
CREATE POLICY "Patients can create registration codes" ON public.registration_codes FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_id);

-- Haversine distance function for nearby doctors
CREATE OR REPLACE FUNCTION public.nearby_doctors(
  user_lat DOUBLE PRECISION, user_lon DOUBLE PRECISION, radius_miles DOUBLE PRECISION DEFAULT 25
)
RETURNS TABLE(doctor_user_id UUID, distance_miles DOUBLE PRECISION)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT d.user_id,
    3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(user_lat)) * cos(radians(p.latitude))
        * cos(radians(p.longitude) - radians(user_lon))
        + sin(radians(user_lat)) * sin(radians(p.latitude))
      ))
    ) AS distance_miles
  FROM doctors d
  JOIN profiles p ON d.user_id = p.user_id
  WHERE d.verification_status = 'approved'
    AND d.offers_home_service = true
    AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND 3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(user_lat)) * cos(radians(p.latitude))
        * cos(radians(p.longitude) - radians(user_lon))
        + sin(radians(user_lat)) * sin(radians(p.latitude))
      ))
    ) <= radius_miles
  ORDER BY distance_miles;
$$;

-- Haversine distance function for nearby facilities
CREATE OR REPLACE FUNCTION public.nearby_facilities(
  user_lat DOUBLE PRECISION, user_lon DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION DEFAULT 25, facility_type TEXT DEFAULT NULL
)
RETURNS TABLE(facility_id UUID, distance_miles DOUBLE PRECISION)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT f.id,
    3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(user_lat)) * cos(radians(f.latitude))
        * cos(radians(f.longitude) - radians(user_lon))
        + sin(radians(user_lat)) * sin(radians(f.latitude))
      ))
    ) AS distance_miles
  FROM facilities f
  WHERE f.is_active = true
    AND f.latitude IS NOT NULL AND f.longitude IS NOT NULL
    AND (facility_type IS NULL OR f.type = facility_type)
    AND 3959 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(user_lat)) * cos(radians(f.latitude))
        * cos(radians(f.longitude) - radians(user_lon))
        + sin(radians(user_lat)) * sin(radians(f.latitude))
      ))
    ) <= radius_miles
  ORDER BY distance_miles;
$$;
