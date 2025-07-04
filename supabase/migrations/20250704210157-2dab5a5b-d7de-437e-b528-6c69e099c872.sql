-- Create test user account for development testing
-- Note: This will create the user via the signup process simulation

-- First check if user exists, if not create them
DO $$
DECLARE
    test_user_id UUID;
    test_profile_id UUID;
    user_exists BOOLEAN;
BEGIN
    -- Check if user already exists
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'test@test.com') INTO user_exists;
    
    IF NOT user_exists THEN
        -- Create the auth user
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
        );
    END IF;
    
    -- Get the user ID
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'test@test.com';
    
    -- Create profile if it doesn't exist
    IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = test_user_id) THEN
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
        );
    END IF;
    
    -- Get profile ID
    SELECT id INTO test_profile_id FROM public.profiles WHERE user_id = test_user_id;
    
    -- Create patient record if it doesn't exist
    IF NOT EXISTS(SELECT 1 FROM public.patients WHERE user_id = test_user_id) THEN
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
        );
    END IF;
END $$;