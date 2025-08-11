-- Allow doctors to view profiles of patients they've attended (completed appointments)
CREATE POLICY "Doctors can view attended patient profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.patient_id = profiles.user_id
      AND a.doctor_id = auth.uid()
      AND a.status = 'completed'
  )
);
