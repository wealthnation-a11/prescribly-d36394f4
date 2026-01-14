-- Drop the dependent policy first, then recreate function with proper search_path
DROP POLICY IF EXISTS "Doctors can view patients with active appointments" ON public.patients;

-- Now we can drop and recreate the function
DROP FUNCTION IF EXISTS public.doctor_has_active_appointment_with_patient(uuid, uuid);

CREATE OR REPLACE FUNCTION public.doctor_has_active_appointment_with_patient(_doctor_user_id uuid, _patient_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM appointments
    WHERE doctor_id = _doctor_user_id
      AND patient_id = _patient_user_id
      AND status IN ('pending', 'approved', 'completed')
  )
$$;

-- Recreate the policy
CREATE POLICY "Doctors can view patients with active appointments"
ON public.patients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'doctor'::user_role) AND 
  doctor_has_active_appointment_with_patient(auth.uid(), user_id)
);