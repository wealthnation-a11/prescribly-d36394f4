-- Fix RLS policies for herbal_practitioners and symptom_condition_map

-- 1. Add policy for public to view approved herbal practitioners
CREATE POLICY "Public can view approved herbal practitioners"
ON public.herbal_practitioners
FOR SELECT
TO authenticated
USING (verification_status = 'approved');

-- 2. Add policy for authenticated users to view symptom_condition_map
CREATE POLICY "Authenticated users can view symptom mappings"
ON public.symptom_condition_map
FOR SELECT
TO authenticated
USING (true);

-- 3. Add policy for service role to manage symptom_condition_map
CREATE POLICY "Service role can manage symptom mappings"
ON public.symptom_condition_map
FOR ALL
USING (
  (auth.jwt() ->> 'role')::text = 'service_role' OR
  has_role(auth.uid(), 'admin'::user_role)
)
WITH CHECK (
  (auth.jwt() ->> 'role')::text = 'service_role' OR
  has_role(auth.uid(), 'admin'::user_role)
);