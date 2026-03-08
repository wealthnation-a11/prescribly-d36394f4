
-- Create facility_staff table
CREATE TABLE public.facility_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'receptionist' CHECK (role IN ('receptionist', 'manager')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, facility_id)
);

-- Enable RLS
ALTER TABLE public.facility_staff ENABLE ROW LEVEL SECURITY;

-- Security definer function to check facility staff membership
CREATE OR REPLACE FUNCTION public.is_facility_staff(_user_id UUID, _facility_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.facility_staff
    WHERE user_id = _user_id
      AND facility_id = _facility_id
      AND is_active = true
  )
$$;

-- Function to get staff's facility_id
CREATE OR REPLACE FUNCTION public.get_staff_facility_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT facility_id
  FROM public.facility_staff
  WHERE user_id = _user_id
    AND is_active = true
  LIMIT 1
$$;

-- RLS: Staff can read their own record
CREATE POLICY "Staff can read own record"
ON public.facility_staff
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS: Admins can manage all staff
CREATE POLICY "Admins can manage facility staff"
ON public.facility_staff
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Facility staff can SELECT registration_codes for their facility
CREATE POLICY "Facility staff can view their facility codes"
ON public.registration_codes
FOR SELECT
TO authenticated
USING (
  facility_id = public.get_staff_facility_id(auth.uid())
);

-- RLS: Facility staff can UPDATE registration_codes for their facility (confirm visits)
CREATE POLICY "Facility staff can confirm their facility codes"
ON public.registration_codes
FOR UPDATE
TO authenticated
USING (
  facility_id = public.get_staff_facility_id(auth.uid())
)
WITH CHECK (
  facility_id = public.get_staff_facility_id(auth.uid())
);
