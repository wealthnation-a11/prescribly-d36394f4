-- Create blog_comments table
CREATE TABLE IF NOT EXISTS public.blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add SEO fields to blog_posts
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS meta_keywords TEXT[],
ADD COLUMN IF NOT EXISTS og_image TEXT;

-- Enable RLS
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Blog comments policies
CREATE POLICY "Public can view approved comments"
  ON public.blog_comments
  FOR SELECT
  USING (approved = true);

CREATE POLICY "Authenticated users can create comments"
  ON public.blog_comments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own comments"
  ON public.blog_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all comments"
  ON public.blog_comments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Newsletter policies
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own subscription"
  ON public.newsletter_subscribers
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own subscription"
  ON public.newsletter_subscribers
  FOR UPDATE
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage all subscriptions"
  ON public.newsletter_subscribers
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Triggers for updated_at
CREATE TRIGGER update_blog_comments_updated_at
  BEFORE UPDATE ON public.blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_newsletter_subscribers_updated_at
  BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_id ON public.blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_approved ON public.blog_comments(approved);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON public.newsletter_subscribers(email);