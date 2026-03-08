-- Create a security definer function to look up a registration code by its value
-- This allows anon users to verify codes without needing direct table access
CREATE OR REPLACE FUNCTION public.verify_registration_code(_code text)
RETURNS TABLE(
  id uuid,
  code text,
  patient_id uuid,
  facility_id uuid,
  status text,
  expires_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz,
  patient_first_name text,
  patient_last_name text,
  facility_name text,
  facility_type text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    rc.id,
    rc.code,
    rc.patient_id,
    rc.facility_id,
    rc.status,
    rc.expires_at,
    rc.confirmed_at,
    rc.created_at,
    p.first_name AS patient_first_name,
    p.last_name AS patient_last_name,
    f.name AS facility_name,
    f.type AS facility_type
  FROM registration_codes rc
  LEFT JOIN profiles p ON p.user_id = rc.patient_id
  LEFT JOIN facilities f ON f.id = rc.facility_id
  WHERE rc.code = _code
  LIMIT 1;
$$;

-- Create a security definer function to confirm a registration code
CREATE OR REPLACE FUNCTION public.confirm_registration_code(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record RECORD;
BEGIN
  SELECT id, status, expires_at INTO code_record
  FROM registration_codes
  WHERE code = _code;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  IF code_record.status = 'used' THEN
    RETURN false;
  END IF;
  
  IF code_record.expires_at < now() THEN
    RETURN false;
  END IF;
  
  UPDATE registration_codes
  SET status = 'used', confirmed_at = now()
  WHERE id = code_record.id;
  
  RETURN true;
END;
$$;