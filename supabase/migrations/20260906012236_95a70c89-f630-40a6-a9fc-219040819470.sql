-- 1. Doctors: remove public read of sensitive columns
DROP POLICY IF EXISTS d_pub ON public.doctors;

CREATE OR REPLACE VIEW public.doctors_public
WITH (security_barrier = true) AS
SELECT id, user_id, specialization, bio, consultation_fee, years_of_experience,
       verification_status, rating, total_reviews, offers_home_service,
       home_service_fee, service_locations, latitude, longitude, created_at
FROM public.doctors
WHERE verification_status = 'approved';

GRANT SELECT ON public.doctors_public TO anon, authenticated;

-- 2. Blog comments: remove public read of author_email
DROP POLICY IF EXISTS bc_pub_read ON public.blog_comments;

CREATE OR REPLACE VIEW public.blog_comments_public
WITH (security_barrier = true) AS
SELECT id, post_id, author_name, content, approved, created_at
FROM public.blog_comments
WHERE approved = true;

GRANT SELECT ON public.blog_comments_public TO anon, authenticated;

-- 3. Revoke anonymous execution of SECURITY DEFINER routines that require a session
REVOKE ALL ON FUNCTION public.award_wellness_points(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_daily_challenges() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refresh_daily_challenges() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_user_points(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_women_data(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_pharmacy_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_pharmacy_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pharmacy_serves_patient(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.compute_eod_summary(uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_registration_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.verify_registration_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_secret_pin(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.verify_secret_pin(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_secret_pin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_approved_doctor(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_care_relationship(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.award_wellness_points(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_daily_challenges() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_daily_challenges() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_user_points(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_women_data(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_pharmacy_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_pharmacy_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pharmacy_serves_patient(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_eod_summary(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_registration_code(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_registration_code(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_secret_pin(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_secret_pin(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_secret_pin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_approved_doctor(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.shares_care_relationship(uuid, uuid) TO authenticated, service_role;
