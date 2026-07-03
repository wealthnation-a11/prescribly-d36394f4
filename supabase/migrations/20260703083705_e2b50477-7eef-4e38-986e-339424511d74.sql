
-- 1) Column-level protection for sensitive fields (RLS row-visibility unchanged; PostgREST enforces column grants)
REVOKE SELECT (kyc_documents, license_number) ON public.doctors FROM anon;
REVOKE SELECT (email, phone, address) ON public.facilities FROM anon;
REVOKE SELECT (author_email) ON public.blog_comments FROM anon;
REVOKE SELECT (author_email) ON public.blog_comments FROM authenticated;

-- 2) analytics_events: require authenticated + user_id = auth.uid()
DROP POLICY IF EXISTS ae_ins ON public.analytics_events;
CREATE POLICY ae_ins ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3) hospital_registrations: require authenticated + user_id = auth.uid()
DROP POLICY IF EXISTS hr_ins ON public.hospital_registrations;
CREATE POLICY hr_ins ON public.hospital_registrations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4) notifications: only service_role may insert (edge functions use service key)
DROP POLICY IF EXISTS notif_ins_srv ON public.notifications;
CREATE POLICY notif_ins_srv ON public.notifications
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 5) wellness_eod_summary: restrict insert to authenticated + service_role, drop anon
DROP POLICY IF EXISTS eod_srv_ins ON public.wellness_eod_summary;
CREATE POLICY eod_srv_ins ON public.wellness_eod_summary
  FOR INSERT TO authenticated, service_role
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- 6) Revoke EXECUTE on SECURITY DEFINER helpers from anon (and authenticated where not needed)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_eod_summary(uuid, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_secret_pin(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_secret_pin(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_secret_pin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_registration_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_registration_code(text) FROM PUBLIC, anon;

-- 7) blog-images public bucket: drop broad SELECT listing policy.
-- Public bucket URLs still serve files directly; removing this policy blocks bulk listing via storage.objects.
DROP POLICY IF EXISTS blog_images_sel ON storage.objects;
