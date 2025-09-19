-- Create admin profile directly (since auth.users is managed by Supabase)
INSERT INTO public.profiles (
  user_id,
  email,
  first_name,
  last_name,
  role,
  phone
) VALUES (
  gen_random_uuid(),
  'admin@prescriblyadmin.lovable.app',
  'Admin',
  'User',
  'admin'::user_role,
  '+1234567890'
) ON CONFLICT DO NOTHING;