
-- blog_posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_id UUID NOT NULL,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  category TEXT,
  tags TEXT[],
  meta_description TEXT,
  meta_keywords TEXT[],
  og_image TEXT,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bp_pub_read" ON public.blog_posts FOR SELECT USING (published = true);
CREATE POLICY "bp_author" ON public.blog_posts FOR ALL USING (auth.uid() = author_id);
CREATE POLICY "bp_adm" ON public.blog_posts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- blog_comments
CREATE TABLE IF NOT EXISTS public.blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bc_pub_read" ON public.blog_comments FOR SELECT USING (approved = true);
CREATE POLICY "bc_ins" ON public.blog_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "bc_adm" ON public.blog_comments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- facility_staff
CREATE TABLE IF NOT EXISTS public.facility_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.facility_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fs_own" ON public.facility_staff FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fs_fac_admin" ON public.facility_staff FOR ALL USING (
  EXISTS (SELECT 1 FROM public.facilities WHERE id = facility_id AND admin_user_id = auth.uid())
);
CREATE POLICY "fs_adm" ON public.facility_staff FOR ALL USING (public.has_role(auth.uid(), 'admin'));
