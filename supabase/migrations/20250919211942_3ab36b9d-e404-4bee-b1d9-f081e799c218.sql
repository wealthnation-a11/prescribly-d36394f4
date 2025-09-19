-- Create admin user profile
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  last_sign_in_at,
  email_change_token_new,
  email_change_sent_at,
  recovery_token,
  recovery_sent_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@prescriblyadmin.lovable.app',
  crypt('1234567890', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"System","last_name":"Admin","role":"admin"}',
  false,
  now(),
  now(),
  now(),
  '',
  now(),
  '',
  now()
) ON CONFLICT (email) DO NOTHING;

-- Create admin profile entry
INSERT INTO public.profiles (
  user_id,
  email,
  first_name,
  last_name,
  role
) SELECT 
  u.id,
  'admin@prescriblyadmin.lovable.app',
  'System',
  'Admin',
  'admin'::user_role
FROM auth.users u 
WHERE u.email = 'admin@prescriblyadmin.lovable.app'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin'::user_role,
  first_name = 'System',
  last_name = 'Admin';