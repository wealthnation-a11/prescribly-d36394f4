
-- Create verify_registration_code function
CREATE OR REPLACE FUNCTION public.verify_registration_code(_code text)
RETURNS TABLE(
  id uuid,
  code text,
  patient_id uuid,
  facility_id uuid,
  appointment_id uuid,
  status text,
  created_at timestamptz,
  verified_at timestamptz,
  patient_first_name text,
  patient_last_name text,
  patient_email text,
  patient_phone text,
  patient_dob date,
  patient_gender text,
  patient_country text,
  facility_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id,
    rc.code,
    rc.patient_id,
    rc.facility_id,
    rc.appointment_id,
    rc.status,
    rc.created_at,
    rc.verified_at,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.date_of_birth,
    p.gender,
    p.country,
    f.name
  FROM registration_codes rc
  LEFT JOIN profiles p ON p.user_id = rc.patient_id
  LEFT JOIN facilities f ON f.id = rc.facility_id
  WHERE rc.code = _code;
END;
$$;

-- Create confirm_registration_code function
CREATE OR REPLACE FUNCTION public.confirm_registration_code(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _found boolean;
BEGIN
  UPDATE registration_codes
  SET status = 'used', verified_at = now()
  WHERE code = _code AND status = 'pending'
  RETURNING true INTO _found;
  
  RETURN COALESCE(_found, false);
END;
$$;

-- Create facility_patient_records table
CREATE TABLE IF NOT EXISTS public.facility_patient_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  registration_code_id uuid,
  diagnosis text,
  treatment_notes text,
  vitals jsonb,
  follow_up_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.facility_patient_records ENABLE ROW LEVEL SECURITY;

-- Staff of the facility can manage records
CREATE POLICY "fpr_staff" ON public.facility_patient_records
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM facility_staff fs
    WHERE fs.facility_id = facility_patient_records.facility_id
    AND fs.user_id = auth.uid()
    AND fs.is_active = true
  )
);

-- Facility admin can manage records
CREATE POLICY "fpr_fac_admin" ON public.facility_patient_records
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM facilities f
    WHERE f.id = facility_patient_records.facility_id
    AND f.admin_user_id = auth.uid()
  )
);

-- Admin can manage all
CREATE POLICY "fpr_adm" ON public.facility_patient_records
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Patients can view their own records
CREATE POLICY "fpr_patient" ON public.facility_patient_records
FOR SELECT USING (auth.uid() = patient_id);
