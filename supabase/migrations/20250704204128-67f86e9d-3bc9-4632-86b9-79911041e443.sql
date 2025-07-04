-- Update the trigger function to handle all user registrations, not just admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Create profile for all users
  IF NEW.email = 'demo@prescribly.com' THEN
    -- Special handling for demo admin
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      'Demo',
      'Admin',
      'admin'::user_role
    );
  ELSE
    -- Handle all other users
    INSERT INTO public.profiles (user_id, email, first_name, last_name, role, phone)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name', 
      COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'patient'::user_role),
      NEW.raw_user_meta_data ->> 'phone'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();