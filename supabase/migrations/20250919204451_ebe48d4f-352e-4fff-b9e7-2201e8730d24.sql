-- Create admin user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  'admin@prescriblyadmin.lovable.app',
  crypt('1234567890', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"first_name": "Admin", "last_name": "User", "role": "admin"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Ensure admin profile exists
INSERT INTO public.profiles (
  user_id,
  email,
  first_name,
  last_name,
  role
) 
SELECT 
  au.id,
  'admin@prescriblyadmin.lovable.app',
  'Admin',
  'User',
  'admin'::user_role
FROM auth.users au
WHERE au.email = 'admin@prescriblyadmin.lovable.app'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin'::user_role;