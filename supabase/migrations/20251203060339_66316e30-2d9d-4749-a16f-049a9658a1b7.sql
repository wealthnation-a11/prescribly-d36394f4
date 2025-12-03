-- =====================================================
-- SECURITY FIX: Critical RLS Policy Vulnerabilities
-- =====================================================

-- 1. FIX NEWSLETTER SUBSCRIBERS - Prevent email harvesting
-- Drop overly permissive SELECT policy if exists
DROP POLICY IF EXISTS "Anyone can view newsletter subscribers" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Users can view their own subscription" ON newsletter_subscribers;

-- Only allow users to check their own subscription by email
CREATE POLICY "Users can view their own subscription" ON newsletter_subscribers
FOR SELECT USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 2. FIX USER SESSIONS - Eliminate anonymous session access
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can create their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON user_sessions;

-- Create strict policies requiring authenticated user_id match
CREATE POLICY "Users can view their own sessions" ON user_sessions
FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" ON user_sessions
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON user_sessions
FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON user_sessions
FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 3. FIX NOTIFICATIONS - Prevent notification spam attacks
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;

-- Only service role (edge functions) can create notifications
CREATE POLICY "Service role can create notifications" ON notifications
FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'role')::text = 'service_role'
);

-- 4. FIX BLOG COMMENTS - Ensure comments can't be impersonated
DROP POLICY IF EXISTS "Authenticated users can create comments" ON blog_comments;

-- Users must set their own user_id when creating comments
CREATE POLICY "Authenticated users can create own comments" ON blog_comments
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (user_id IS NULL OR user_id = auth.uid())
);