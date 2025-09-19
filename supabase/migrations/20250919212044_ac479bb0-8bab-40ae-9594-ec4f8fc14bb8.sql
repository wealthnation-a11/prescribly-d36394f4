-- Ensure admin profile exists when admin user is created through auth
-- This function will be triggered by the auth.users trigger

-- Update the existing handle_new_user function to handle admin users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Handle admin user specifically
  IF NEW.email = 'admin@prescriblyadmin.lovable.app' THEN
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      'System',
      'Admin',
      'admin'::user_role
    );
  ELSE
    -- Default behavior for other users
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''), 
      CASE 
        WHEN NEW.raw_user_meta_data ->> 'role' = 'doctor' THEN 'doctor'::user_role
        WHEN NEW.raw_user_meta_data ->> 'role' = 'patient' THEN 'patient'::user_role
        ELSE 'patient'::user_role
      END
    );
  END IF;
  RETURN NEW;
END;
$$;