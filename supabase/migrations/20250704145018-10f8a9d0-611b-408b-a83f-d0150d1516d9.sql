-- Create a function to handle admin user creation
CREATE OR REPLACE FUNCTION public.handle_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If this is the demo admin email, set role to admin
  IF NEW.email = 'demo@prescribly.com' THEN
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      'Demo',
      'Admin',
      'admin'::user_role
    );
  ELSE
    -- Default behavior for other users
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'patient')
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new trigger with admin handling
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_user();

-- Also handle existing demo user if they exist
DO $$
BEGIN
  -- Check if demo user exists in auth.users and update their profile
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'demo@prescribly.com') THEN
    -- Update existing profile to admin role
    UPDATE public.profiles 
    SET role = 'admin'::user_role,
        first_name = 'Demo',
        last_name = 'Admin'
    WHERE email = 'demo@prescribly.com';
    
    -- If profile doesn't exist, create it
    IF NOT FOUND THEN
      INSERT INTO public.profiles (user_id, email, first_name, last_name, role)
      SELECT id, email, 'Demo', 'Admin', 'admin'::user_role
      FROM auth.users 
      WHERE email = 'demo@prescribly.com';
    END IF;
  END IF;
END $$;