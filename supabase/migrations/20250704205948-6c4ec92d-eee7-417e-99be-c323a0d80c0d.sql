-- Create test user for development
-- First, create the auth user (this will trigger the profile creation)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  is_sso_user,
  role,
  aud
) VALUES (
  gen_random_uuid(),
  'test@test.com',
  crypt('Bonaventure@01@', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"first_name": "Test", "last_name": "User", "phone": "1234567890", "role": "patient"}',
  false,
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Get the user ID for the test user
DO $$
DECLARE
    test_user_id UUID;
    test_profile_id UUID;
BEGIN
    -- Get the user ID
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'test@test.com';
    
    -- Insert or update profile
    INSERT INTO public.profiles (
        user_id, 
        email, 
        first_name, 
        last_name, 
        role, 
        phone
    ) VALUES (
        test_user_id,
        'test@test.com',
        'Test',
        'User',
        'patient',
        '1234567890'
    ) ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role,
        phone = EXCLUDED.phone;
    
    -- Get the profile ID
    SELECT id INTO test_profile_id 
    FROM public.profiles 
    WHERE user_id = test_user_id;
    
    -- Insert patient record
    INSERT INTO public.patients (
        user_id,
        profile_id,
        first_name,
        last_name,
        email,
        phone,
        registration_status
    ) VALUES (
        test_user_id,
        test_profile_id,
        'Test',
        'User',
        'test@test.com',
        '1234567890',
        'active'
    ) ON CONFLICT (user_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone;
END $$;