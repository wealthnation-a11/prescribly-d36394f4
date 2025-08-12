-- 1) Restrict public access on doctors table by removing public SELECT policy
DROP POLICY IF EXISTS "Anyone can view verified doctors" ON public.doctors;

-- 2) Create a sanitized public-facing table for doctor profiles
CREATE TABLE IF NOT EXISTS public.public_doctor_profiles (
  doctor_id uuid PRIMARY KEY,
  doctor_user_id uuid NOT NULL,
  first_name text,
  last_name text,
  specialization text NOT NULL,
  bio text,
  avatar_url text,
  rating numeric,
  total_reviews integer,
  years_of_experience integer,
  consultation_fee numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_user_id)
);

-- Enable RLS and allow only authenticated users to read
ALTER TABLE public.public_doctor_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'public_doctor_profiles' AND policyname = 'Authenticated users can view public doctor profiles'
  ) THEN
    CREATE POLICY "Authenticated users can view public doctor profiles"
    ON public.public_doctor_profiles
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- 3) Function to refresh a doctor's public profile row from doctors + profiles
CREATE OR REPLACE FUNCTION public.refresh_public_doctor_profile(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  d RECORD;
  p RECORD;
BEGIN
  SELECT * INTO d FROM public.doctors WHERE user_id = _user_id;

  IF NOT FOUND THEN
    DELETE FROM public.public_doctor_profiles WHERE doctor_user_id = _user_id;
    RETURN;
  END IF;

  SELECT first_name, last_name, avatar_url INTO p FROM public.profiles WHERE user_id = _user_id;

  IF d.verification_status = 'approved' THEN
    INSERT INTO public.public_doctor_profiles AS pdp (
      doctor_id, doctor_user_id, first_name, last_name, specialization, bio, avatar_url, rating, total_reviews, years_of_experience, consultation_fee, created_at, updated_at
    )
    VALUES (
      d.id, d.user_id, p.first_name, p.last_name, d.specialization, d.bio, p.avatar_url, d.rating, d.total_reviews, d.years_of_experience, d.consultation_fee, now(), now()
    )
    ON CONFLICT (doctor_id) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        specialization = EXCLUDED.specialization,
        bio = EXCLUDED.bio,
        avatar_url = EXCLUDED.avatar_url,
        rating = EXCLUDED.rating,
        total_reviews = EXCLUDED.total_reviews,
        years_of_experience = EXCLUDED.years_of_experience,
        consultation_fee = EXCLUDED.consultation_fee,
        updated_at = now();
  ELSE
    DELETE FROM public.public_doctor_profiles WHERE doctor_user_id = _user_id;
  END IF;
END;
$$;

-- 4) Trigger function wrapper to call refresh on doctors/profiles changes
CREATE OR REPLACE FUNCTION public.tg_refresh_public_doctor_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_TABLE_NAME = 'doctors' THEN
    IF TG_OP IN ('INSERT','UPDATE') THEN
      PERFORM public.refresh_public_doctor_profile(NEW.user_id);
    ELSIF TG_OP = 'DELETE' THEN
      PERFORM public.refresh_public_doctor_profile(OLD.user_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    PERFORM public.refresh_public_doctor_profile(NEW.user_id);
  END IF;
  RETURN NULL;
END;
$$;

-- 5) Triggers on doctors and profiles
DROP TRIGGER IF EXISTS on_doctors_refresh_public ON public.doctors;
CREATE TRIGGER on_doctors_refresh_public
AFTER INSERT OR UPDATE OR DELETE ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_public_doctor_profile();

DROP TRIGGER IF EXISTS on_profiles_refresh_public ON public.profiles;
CREATE TRIGGER on_profiles_refresh_public
AFTER UPDATE OF first_name, last_name, avatar_url ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_public_doctor_profile();

-- 6) Maintain updated_at automatically
DROP TRIGGER IF EXISTS update_public_doctor_profiles_updated_at ON public.public_doctor_profiles;
CREATE TRIGGER update_public_doctor_profiles_updated_at
BEFORE UPDATE ON public.public_doctor_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Backfill existing approved doctors
INSERT INTO public.public_doctor_profiles (
  doctor_id, doctor_user_id, first_name, last_name, specialization, bio, avatar_url, rating, total_reviews, years_of_experience, consultation_fee
)
SELECT d.id, d.user_id, p.first_name, p.last_name, d.specialization, d.bio, p.avatar_url, d.rating, d.total_reviews, d.years_of_experience, d.consultation_fee
FROM public.doctors d
JOIN public.profiles p ON p.user_id = d.user_id
WHERE d.verification_status = 'approved'
ON CONFLICT (doctor_id) DO NOTHING;