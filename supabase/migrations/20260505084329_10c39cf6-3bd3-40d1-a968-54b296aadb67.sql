UPDATE public.profiles SET is_legacy = true WHERE role IN ('patient','user');
ALTER TABLE public.profiles ALTER COLUMN is_legacy SET DEFAULT true;