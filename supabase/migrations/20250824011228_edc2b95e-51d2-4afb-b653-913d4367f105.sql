-- Secure medical conditions table - restrict to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can view conditions" ON public.conditions;
CREATE POLICY "Authenticated users can view conditions" 
ON public.conditions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Secure companion questions table - restrict to authenticated users only  
DROP POLICY IF EXISTS "Anyone can view companion questions" ON public.companion_questions;
CREATE POLICY "Authenticated users can view companion questions" 
ON public.companion_questions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Add RLS policy for diagnostic_questions table
CREATE POLICY "Authenticated users can view diagnostic questions" 
ON public.diagnostic_questions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Add RLS policy for aliases table
ALTER TABLE public.aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can access aliases" 
ON public.aliases 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Secure challenges table - only show active challenges to authenticated users
DROP POLICY IF EXISTS "Anyone can view active challenges" ON public.challenges;
CREATE POLICY "Authenticated users can view active challenges" 
ON public.challenges 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND active = true);

-- Add policy for admins to manage challenges
CREATE POLICY "Admins can manage all challenges" 
ON public.challenges 
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));