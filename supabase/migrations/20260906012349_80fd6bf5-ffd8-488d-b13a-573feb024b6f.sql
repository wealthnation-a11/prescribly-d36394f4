DROP VIEW IF EXISTS public.doctors_public;
DROP VIEW IF EXISTS public.blog_comments_public;

DROP POLICY IF EXISTS d_pub ON public.doctors;
CREATE POLICY d_pub ON public.doctors FOR SELECT USING (verification_status = 'approved');
DROP POLICY IF EXISTS bc_pub_read ON public.blog_comments;
CREATE POLICY bc_pub_read ON public.blog_comments FOR SELECT USING (approved = true);

REVOKE SELECT ON public.doctors FROM anon, authenticated;
GRANT SELECT (id, user_id, profile_id, specialization, bio, consultation_fee,
  years_of_experience, verification_status, rating, total_reviews,
  offers_home_service, home_service_fee, service_locations, latitude, longitude,
  created_at, updated_at) ON public.doctors TO anon, authenticated;
GRANT INSERT, UPDATE ON public.doctors TO authenticated;
GRANT ALL ON public.doctors TO service_role;

REVOKE SELECT ON public.blog_comments FROM anon, authenticated;
GRANT SELECT (id, post_id, author_name, content, approved, created_at)
  ON public.blog_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_comments TO authenticated;
GRANT INSERT ON public.blog_comments TO anon;
GRANT ALL ON public.blog_comments TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_doctor_credentials()
RETURNS TABLE(license_number text, kyc_documents jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.license_number, d.kyc_documents::jsonb
  FROM public.doctors d
  WHERE d.user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.get_my_doctor_credentials() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_doctor_credentials() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_list_blog_comments()
RETURNS TABLE(id uuid, post_id uuid, author_name text,
              author_email text, content text, approved boolean, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT c.id, c.post_id, c.author_name, c.author_email,
           c.content, c.approved, c.created_at
    FROM public.blog_comments c
    ORDER BY c.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_blog_comments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_blog_comments() TO authenticated, service_role;
