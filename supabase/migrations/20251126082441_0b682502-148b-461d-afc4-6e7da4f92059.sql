-- Security Enhancement - Newsletter and Validation
-- Skip existing policies

-- 1. Secure newsletter subscriptions
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON newsletter_subscribers;

CREATE POLICY "Authenticated users can subscribe"
ON newsletter_subscribers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM newsletter_subscribers ns2
    WHERE ns2.email = newsletter_subscribers.email
  )
);

DROP POLICY IF EXISTS "Admins can view subscribers" ON newsletter_subscribers;

CREATE POLICY "Admins can view subscribers"
ON newsletter_subscribers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 2. Add security indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role 
ON user_roles(user_id, role);

CREATE INDEX IF NOT EXISTS idx_herbal_practitioners_user_id 
ON herbal_practitioners(user_id) 
WHERE verification_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_doctors_user_id 
ON doctors(user_id) 
WHERE verification_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_appointments_patient_doctor
ON appointments(patient_id, doctor_id, status);

CREATE INDEX IF NOT EXISTS idx_herbal_consultations_patient_practitioner
ON herbal_consultations(patient_id, practitioner_id, status);

-- 3. Add email format validation constraints
DO $$ 
BEGIN
  ALTER TABLE herbal_practitioners
  ADD CONSTRAINT check_practitioner_email_format 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE patients
  ADD CONSTRAINT check_patient_email_format 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Add security comments
COMMENT ON POLICY "Authenticated users can subscribe" ON newsletter_subscribers IS 
  'Requires authentication and prevents duplicate email subscriptions to stop spam';

COMMENT ON INDEX idx_user_roles_user_id_role IS 
  'Optimizes role-based security checks in RLS policies';