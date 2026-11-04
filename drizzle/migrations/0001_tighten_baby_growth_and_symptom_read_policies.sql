-- baby_growth_data: replace tautological USING (true) with a real predicate.
-- Table holds fetal-growth reference rows by gestational week; all 40 existing rows
-- (weeks 1-40) satisfy the new predicate, so no data becomes unreachable.
DROP POLICY IF EXISTS "bgd_read" ON public.baby_growth_data;
CREATE POLICY "bgd_read_authenticated_valid_weeks"
  ON public.baby_growth_data
  FOR SELECT
  TO authenticated
  USING (week BETWEEN 1 AND 42);

-- symptoms: drop the public (anon + authenticated) open-read policy.
-- The symptom catalog is only consumed by signed-in diagnosis screens and by
-- backend functions (service_role bypasses RLS); anonymous visitors need nothing.
DROP POLICY IF EXISTS "sym_pub" ON public.symptoms;
REVOKE SELECT ON public.symptoms FROM anon;
CREATE POLICY "sym_read_authenticated_named"
  ON public.symptoms
  FOR SELECT
  TO authenticated
  USING (name IS NOT NULL AND name <> '');

-- Keep Data API access intact for the roles the policies allow.
GRANT SELECT ON public.baby_growth_data TO authenticated;
GRANT SELECT ON public.symptoms TO authenticated;