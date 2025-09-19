-- Update the admin user profile
UPDATE public.profiles 
SET role = 'admin', is_legacy = true 
WHERE email = 'synectics01@gmail.com';

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE email = user_email
      AND role = 'admin'
  )
$$;