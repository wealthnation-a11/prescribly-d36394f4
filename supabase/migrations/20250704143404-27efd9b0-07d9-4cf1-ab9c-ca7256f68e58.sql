-- Update the user with email demo@prescribly.com to be an admin
-- This will run after the user signs up with that email
UPDATE public.profiles 
SET role = 'admin'::user_role 
WHERE email = 'demo@prescribly.com';