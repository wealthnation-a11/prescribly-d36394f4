-- Allow authenticated users to view doctor availability for booking
CREATE POLICY IF NOT EXISTS "Authenticated users can view doctor availability"
ON public.doctor_availability
FOR SELECT
TO authenticated
USING (true);
