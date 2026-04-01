
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user', first_name TEXT, last_name TEXT, email TEXT, phone TEXT,
  avatar_url TEXT, date_of_birth DATE, gender TEXT, location_country TEXT, location_state TEXT,
  country TEXT, is_legacy BOOLEAN DEFAULT false, dashboard_tour_completed BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p_sel" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "p_upd" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "p_ins" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "p_srv" ON public.profiles FOR ALL USING (auth.role() = 'service_role');
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name, phone, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'first_name',''), COALESCE(NEW.raw_user_meta_data->>'last_name',''), COALESCE(NEW.raw_user_meta_data->>'phone',''), COALESCE(NEW.raw_user_meta_data->>'role','user'));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL, UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ur_sel" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ur_srv" ON public.user_roles FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "p_adm_sel" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "p_adm_upd" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id),
  specialization TEXT NOT NULL, bio TEXT, license_number TEXT,
  consultation_fee NUMERIC, years_of_experience INTEGER,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  kyc_documents JSONB DEFAULT '{}'::jsonb,
  rating NUMERIC DEFAULT 0, total_reviews INTEGER DEFAULT 0,
  offers_home_service BOOLEAN DEFAULT false, home_service_fee NUMERIC,
  service_locations JSONB, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "d_sel" ON public.doctors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "d_upd" ON public.doctors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "d_ins" ON public.doctors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "d_pub" ON public.doctors FOR SELECT USING (verification_status = 'approved');
CREATE POLICY "d_adm" ON public.doctors FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('doctor-documents', 'doctor-documents', false);
CREATE POLICY "doc_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'doctor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "doc_view" ON storage.objects FOR SELECT USING (bucket_id = 'doctor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "doc_adm" ON storage.objects FOR SELECT USING (bucket_id = 'doctor-documents' AND public.has_role(auth.uid(), 'admin'));
