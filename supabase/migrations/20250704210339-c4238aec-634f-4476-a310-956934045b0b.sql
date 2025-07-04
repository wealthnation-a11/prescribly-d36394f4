-- Create the user_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'patient');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Now create the test user
DO $$
DECLARE
    test_user_id UUID;
    test_profile_id UUID;
    user_exists BOOLEAN;
BEGIN
    -- Check if user already exists
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'test@test.com') INTO user_exists;
    
    IF NOT user_exists THEN
        -- Create the auth user (this will also trigger the profile creation via trigger)
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
        
        -- Get the user ID
        SELECT id INTO test_user_id FROM auth.users WHERE email = 'test@test.com';
        
        -- Wait for trigger to create profile, then create patient record
        PERFORM pg_sleep(1);
        
        -- Get profile ID
        SELECT id INTO test_profile_id FROM public.profiles WHERE user_id = test_user_id;
        
        -- Create patient record
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