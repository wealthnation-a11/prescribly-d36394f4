
DROP FUNCTION IF EXISTS public.verify_registration_code(text);

CREATE OR REPLACE FUNCTION public.verify_registration_code(_code text)
 RETURNS TABLE(
   id uuid, code text, patient_id uuid, facility_id uuid, status text,
   expires_at timestamp with time zone, confirmed_at timestamp with time zone,
   created_at timestamp with time zone, patient_first_name text, patient_last_name text,
   facility_name text, facility_type text,
   patient_email text, patient_phone text, patient_dob text,
   patient_gender text, patient_country text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    rc.id, rc.code, rc.patient_id, rc.facility_id, rc.status,
    rc.expires_at, rc.confirmed_at, rc.created_at,
    p.first_name AS patient_first_name,
    p.last_name AS patient_last_name,
    f.name AS facility_name,
    f.type AS facility_type,
    p.email AS patient_email,
    p.phone AS patient_phone,
    p.date_of_birth::text AS patient_dob,
    p.gender AS patient_gender,
    p.country AS patient_country
  FROM registration_codes rc
  LEFT JOIN profiles p ON p.user_id = rc.patient_id
  LEFT JOIN facilities f ON f.id = rc.facility_id
  WHERE rc.code = _code
  LIMIT 1;
$$;
