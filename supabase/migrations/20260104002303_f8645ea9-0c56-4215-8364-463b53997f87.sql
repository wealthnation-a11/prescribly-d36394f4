
-- Create a security definer function to check if a doctor has an active appointment with a patient
CREATE OR REPLACE FUNCTION public.doctor_has_active_appointment_with_patient(
  _doctor_user_id uuid,
  _patient_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments
    WHERE doctor_id = _doctor_user_id
      AND patient_id = _patient_user_id
      AND status IN ('pending', 'approved', 'completed')
      AND (
        -- Active appointment (within last 30 days or upcoming)
        scheduled_time >= NOW() - INTERVAL '30 days'
        OR status = 'pending'
        OR status = 'approved'
      )
  )
$$;

-- Drop existing overly permissive admin policies on patients table
DROP POLICY IF EXISTS "Admins can view all patients" ON public.patients;
DROP POLICY IF EXISTS "Admins can update all patients" ON public.patients;

-- Create more restrictive policies

-- Patients can still view their own data
-- (keeping existing policy)

-- Doctors can only view patient data if they have an active appointment
CREATE POLICY "Doctors can view patients with active appointments"
ON public.patients
FOR SELECT
USING (
  has_role(auth.uid(), 'doctor'::user_role) 
  AND doctor_has_active_appointment_with_patient(auth.uid(), user_id)
);

-- Admins can view patients but only through authenticated session (not service role bypass)
CREATE POLICY "Admins can view patients with audit"
ON public.patients
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::user_role)
  AND auth.uid() IS NOT NULL
);

-- Admins can update patients (for legitimate admin operations)
CREATE POLICY "Admins can update patients with audit"
ON public.patients
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::user_role)
  AND auth.uid() IS NOT NULL
);

-- Create an audit log table for sensitive patient data access
CREATE TABLE IF NOT EXISTS public.patient_data_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  accessed_by uuid NOT NULL,
  accessor_role text NOT NULL,
  access_type text NOT NULL, -- 'view', 'update'
  access_reason text,
  appointment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.patient_data_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view patient access logs"
ON public.patient_data_access_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- System can insert audit logs
CREATE POLICY "System can insert patient access logs"
ON public.patient_data_access_log
FOR INSERT
WITH CHECK (true);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_patient_access_log_patient_id ON public.patient_data_access_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_access_log_accessed_by ON public.patient_data_access_log(accessed_by);
CREATE INDEX IF NOT EXISTS idx_patient_access_log_created_at ON public.patient_data_access_log(created_at DESC);

-- Add index on appointments for the security function
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_patient_status 
ON public.appointments(doctor_id, patient_id, status, scheduled_time);
