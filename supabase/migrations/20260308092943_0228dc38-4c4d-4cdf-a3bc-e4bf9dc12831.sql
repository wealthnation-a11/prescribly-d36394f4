
-- Allow anonymous/unauthenticated users to also submit hospital registrations
-- Drop existing insert policy and create a more permissive one
DROP POLICY IF EXISTS "Authenticated users can submit hospital registrations" ON public.hospital_registrations;

CREATE POLICY "Anyone can submit hospital registrations"
  ON public.hospital_registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
