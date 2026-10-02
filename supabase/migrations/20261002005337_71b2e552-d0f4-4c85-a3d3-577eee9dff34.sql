DROP POLICY IF EXISTS bc_ins ON public.blog_comments;
CREATE POLICY bc_ins ON public.blog_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND approved = false);
DROP POLICY IF EXISTS blog_images_ins ON storage.objects;
CREATE POLICY blog_images_ins ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS hp_pub ON public.herbal_practitioners;