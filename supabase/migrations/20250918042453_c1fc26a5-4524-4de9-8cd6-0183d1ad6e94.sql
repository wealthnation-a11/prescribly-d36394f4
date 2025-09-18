-- Add is_legacy column to profiles table for existing users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_legacy boolean DEFAULT false;

-- Update all existing users to be legacy users (no payment required)
UPDATE public.profiles SET is_legacy = true WHERE created_at < NOW();

-- Create a trigger to set new users as non-legacy by default
CREATE OR REPLACE FUNCTION set_new_user_legacy_status()
RETURNS TRIGGER AS $$
BEGIN
  -- New users (created after this migration) are not legacy by default
  NEW.is_legacy = false;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_legacy_status_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_new_user_legacy_status();