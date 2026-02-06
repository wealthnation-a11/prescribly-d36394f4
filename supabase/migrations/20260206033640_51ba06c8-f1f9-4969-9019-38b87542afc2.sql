
DROP POLICY IF EXISTS "Authenticated users can create security audit logs" ON security_audit;
DROP POLICY IF EXISTS "System can create security audit logs" ON security_audit;

CREATE POLICY "Deny authenticated insert to security_audit"
ON security_audit FOR INSERT
TO authenticated
WITH CHECK (false);
