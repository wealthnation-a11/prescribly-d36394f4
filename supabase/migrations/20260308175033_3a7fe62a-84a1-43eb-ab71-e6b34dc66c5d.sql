-- 1. Fix blog_comments: restrict to authenticated only
DROP POLICY IF EXISTS "Public can view approved comments" ON public.blog_comments;

CREATE POLICY "Authenticated can view approved comments"
ON public.blog_comments
FOR SELECT
TO authenticated
USING (approved = true);

-- 2. Fix doctor_overrides: restrict INSERT to doctors only (doctor_id is uuid)
DROP POLICY IF EXISTS "Authenticated users can create doctor overrides" ON public.doctor_overrides;

CREATE POLICY "Only doctors can create doctor overrides"
ON public.doctor_overrides
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'doctor') AND doctor_id = auth.uid()
);

-- 3. Tighten emergency_flags INSERT to doctors only (flagged_by is text, cast uid)
DROP POLICY IF EXISTS "Authenticated users can create emergency flags" ON public.emergency_flags;

CREATE POLICY "Only doctors can create emergency flags"
ON public.emergency_flags
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'doctor') AND flagged_by = auth.uid()::text
);

-- 4. Tighten ai_confidence_logs INSERT to service_role only
DROP POLICY IF EXISTS "Authenticated users can insert confidence logs" ON public.ai_confidence_logs;

CREATE POLICY "Only service role can insert confidence logs"
ON public.ai_confidence_logs
FOR INSERT
TO service_role
WITH CHECK (true);