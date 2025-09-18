-- Fix the function search path for security
CREATE OR REPLACE FUNCTION set_new_user_legacy_status()
RETURNS TRIGGER AS $$
BEGIN
  -- New users (created after this migration) are not legacy by default
  NEW.is_legacy = false;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;