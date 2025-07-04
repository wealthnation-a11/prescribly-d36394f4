-- Create the user_role enum type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'patient');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ensure the profiles table has the correct structure
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'patient'::user_role;

-- Recreate the admin user handling function
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
      COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'patient'::user_role)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_user();