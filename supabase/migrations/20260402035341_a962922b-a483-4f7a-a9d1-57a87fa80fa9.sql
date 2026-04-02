
-- health_tips
CREATE TABLE IF NOT EXISTS public.health_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tip TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.health_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "health_tips_public_read" ON public.health_tips FOR SELECT USING (true);

-- daily_tips
CREATE TABLE IF NOT EXISTS public.daily_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  tip_id UUID REFERENCES public.health_tips(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_tips_public_read" ON public.daily_tips FOR SELECT USING (true);

-- doctor_reviews
CREATE TABLE IF NOT EXISTS public.doctor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  appointment_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_sel" ON public.doctor_reviews FOR SELECT USING (true);
CREATE POLICY "dr_ins" ON public.doctor_reviews FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "dr_adm" ON public.doctor_reviews FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- user_achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT NOT NULL,
  date_awarded TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ua_sel" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ua_ins" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_routes
CREATE TABLE IF NOT EXISTS public.user_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  total_distance_km NUMERIC NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  avg_pace_min_per_km NUMERIC,
  calories_burned NUMERIC DEFAULT 0,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  activity_type TEXT NOT NULL DEFAULT 'walk',
  route_points JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ur_sel" ON public.user_routes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ur_ins" ON public.user_routes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ur_del" ON public.user_routes FOR DELETE USING (auth.uid() = user_id);

-- user_points
CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "up_sel" ON public.user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "up_ins" ON public.user_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "up_upd" ON public.user_points FOR UPDATE USING (auth.uid() = user_id);

-- user_steps
CREATE TABLE IF NOT EXISTS public.user_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  step_count INTEGER NOT NULL DEFAULT 0,
  goal INTEGER NOT NULL DEFAULT 5000,
  goal_reached BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.user_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "us_sel" ON public.user_steps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "us_ins" ON public.user_steps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "us_upd" ON public.user_steps FOR UPDATE USING (auth.uid() = user_id);

-- user_hydration_log
CREATE TABLE IF NOT EXISTS public.user_hydration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  glasses_drank INTEGER NOT NULL DEFAULT 0,
  goal INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.user_hydration_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uh_sel" ON public.user_hydration_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "uh_ins" ON public.user_hydration_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "uh_upd" ON public.user_hydration_log FOR UPDATE USING (auth.uid() = user_id);

-- user_challenges
CREATE TABLE IF NOT EXISTS public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_type TEXT NOT NULL,
  challenge_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  progress NUMERIC DEFAULT 0,
  target NUMERIC DEFAULT 100,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uc_sel" ON public.user_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "uc_ins" ON public.user_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "uc_upd" ON public.user_challenges FOR UPDATE USING (auth.uid() = user_id);

-- user_history
CREATE TABLE IF NOT EXISTS public.user_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uhist_sel" ON public.user_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "uhist_ins" ON public.user_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_diagnosis_history
CREATE TABLE IF NOT EXISTS public.user_diagnosis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symptoms TEXT[],
  diagnosis TEXT,
  severity TEXT,
  recommendations TEXT[],
  ai_model TEXT,
  confidence NUMERIC,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_diagnosis_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "udh_sel" ON public.user_diagnosis_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "udh_ins" ON public.user_diagnosis_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  facility_id UUID,
  appointment_type TEXT NOT NULL DEFAULT 'chat',
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_date DATE,
  scheduled_time TEXT,
  notes TEXT,
  reason TEXT,
  registration_code TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_amount NUMERIC,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apt_patient" ON public.appointments FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "apt_doctor" ON public.appointments FOR SELECT USING (auth.uid() = doctor_id);
CREATE POLICY "apt_ins" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "apt_upd_patient" ON public.appointments FOR UPDATE USING (auth.uid() = patient_id);
CREATE POLICY "apt_upd_doctor" ON public.appointments FOR UPDATE USING (auth.uid() = doctor_id);
CREATE POLICY "apt_adm" ON public.appointments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- facilities
CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  facility_type TEXT DEFAULT 'hospital',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_verified BOOLEAN DEFAULT false,
  admin_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fac_pub" ON public.facilities FOR SELECT USING (true);
CREATE POLICY "fac_ins" ON public.facilities FOR INSERT WITH CHECK (auth.uid() = admin_user_id);
CREATE POLICY "fac_upd" ON public.facilities FOR UPDATE USING (auth.uid() = admin_user_id);
CREATE POLICY "fac_adm" ON public.facilities FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- registration_codes
CREATE TABLE IF NOT EXISTS public.registration_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  appointment_id UUID REFERENCES public.appointments(id),
  patient_id UUID NOT NULL,
  facility_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rc_patient" ON public.registration_codes FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "rc_ins" ON public.registration_codes FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "rc_fac" ON public.registration_codes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.facilities WHERE id = facility_id AND admin_user_id = auth.uid())
);
CREATE POLICY "rc_adm" ON public.registration_codes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  amount NUMERIC,
  currency TEXT DEFAULT 'NGN',
  payment_reference TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_sel" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sub_ins" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sub_upd" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sub_adm" ON public.subscriptions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_sel" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_upd" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notif_del" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "notif_ins_srv" ON public.notifications FOR INSERT WITH CHECK (true);

-- messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  appointment_id UUID,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_sel" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "msg_ins" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "msg_upd" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- prescriptions
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  appointment_id UUID,
  medication TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  instructions TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rx_patient" ON public.prescriptions FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "rx_doctor" ON public.prescriptions FOR ALL USING (auth.uid() = doctor_id);
CREATE POLICY "rx_adm" ON public.prescriptions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- consultation_payments
CREATE TABLE IF NOT EXISTS public.consultation_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  appointment_id UUID,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consultation_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_patient" ON public.consultation_payments FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "cp_doctor" ON public.consultation_payments FOR SELECT USING (auth.uid() = doctor_id);
CREATE POLICY "cp_ins" ON public.consultation_payments FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "cp_adm" ON public.consultation_payments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- doctor_availability
CREATE TABLE IF NOT EXISTS public.doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "da_pub" ON public.doctor_availability FOR SELECT USING (true);
CREATE POLICY "da_doc" ON public.doctor_availability FOR ALL USING (auth.uid() = doctor_id);

-- hospital_registrations
CREATE TABLE IF NOT EXISTS public.hospital_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  registration_number TEXT,
  contact_person TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hospital_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_own" ON public.hospital_registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "hr_ins" ON public.hospital_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "hr_adm" ON public.hospital_registrations FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps_sel" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ps_ins" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ps_del" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- exchange_rates
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL DEFAULT 'USD',
  target_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "er_pub" ON public.exchange_rates FOR SELECT USING (true);

-- analytics_events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ae_ins" ON public.analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "ae_adm" ON public.analytics_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- user_sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usess_sel" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usess_ins" ON public.user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usess_upd" ON public.user_sessions FOR UPDATE USING (auth.uid() = user_id);

-- user_sleep_log
CREATE TABLE IF NOT EXISTS public.user_sleep_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  hours_slept NUMERIC,
  quality TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.user_sleep_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usl_sel" ON public.user_sleep_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usl_ins" ON public.user_sleep_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usl_upd" ON public.user_sleep_log FOR UPDATE USING (auth.uid() = user_id);

-- user_mindfulness_log
CREATE TABLE IF NOT EXISTS public.user_mindfulness_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  minutes_practiced INTEGER DEFAULT 0,
  session_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.user_mindfulness_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uml_sel" ON public.user_mindfulness_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "uml_ins" ON public.user_mindfulness_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "uml_upd" ON public.user_mindfulness_log FOR UPDATE USING (auth.uid() = user_id);

-- user_daily_checkins
CREATE TABLE IF NOT EXISTS public.user_daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  mood TEXT,
  energy_level INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.user_daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "udc_sel" ON public.user_daily_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "udc_ins" ON public.user_daily_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_assessments
CREATE TABLE IF NOT EXISTS public.user_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  assessment_type TEXT NOT NULL,
  score NUMERIC,
  answers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uas_sel" ON public.user_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "uas_ins" ON public.user_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_encryption_keys
CREATE TABLE IF NOT EXISTS public.user_encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_encryption_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uek_sel" ON public.user_encryption_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "uek_ins" ON public.user_encryption_keys FOR INSERT WITH CHECK (auth.uid() = user_id);

-- herbal_practitioners
CREATE TABLE IF NOT EXISTS public.herbal_practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_name TEXT,
  specialization TEXT,
  bio TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_verified BOOLEAN DEFAULT false,
  rating NUMERIC DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.herbal_practitioners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_pub" ON public.herbal_practitioners FOR SELECT USING (true);
CREATE POLICY "hp_own" ON public.herbal_practitioners FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "hp_adm" ON public.herbal_practitioners FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- herbal_remedies
CREATE TABLE IF NOT EXISTS public.herbal_remedies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  ingredients TEXT[],
  usage_instructions TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'NGN',
  image_url TEXT,
  is_approved BOOLEAN DEFAULT false,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.herbal_remedies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hrem_pub" ON public.herbal_remedies FOR SELECT USING (is_approved = true);
CREATE POLICY "hrem_own" ON public.herbal_remedies FOR ALL USING (
  EXISTS (SELECT 1 FROM public.herbal_practitioners WHERE id = practitioner_id AND user_id = auth.uid())
);
CREATE POLICY "hrem_adm" ON public.herbal_remedies FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- herbal_articles
CREATE TABLE IF NOT EXISTS public.herbal_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.herbal_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ha_pub" ON public.herbal_articles FOR SELECT USING (is_published = true AND is_approved = true);
CREATE POLICY "ha_own" ON public.herbal_articles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.herbal_practitioners WHERE id = practitioner_id AND user_id = auth.uid())
);
CREATE POLICY "ha_adm" ON public.herbal_articles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- herbal_consultations
CREATE TABLE IF NOT EXISTS public.herbal_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.herbal_consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hc_patient" ON public.herbal_consultations FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "hc_pract" ON public.herbal_consultations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.herbal_practitioners WHERE id = practitioner_id AND user_id = auth.uid())
);
CREATE POLICY "hc_ins" ON public.herbal_consultations FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- herbal_messages
CREATE TABLE IF NOT EXISTS public.herbal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES public.herbal_consultations(id),
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.herbal_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hm_sel" ON public.herbal_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.herbal_consultations WHERE id = consultation_id AND (patient_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.herbal_practitioners WHERE id = practitioner_id AND user_id = auth.uid())))
);
CREATE POLICY "hm_ins" ON public.herbal_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- orders (herbal shop)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  items JSONB NOT NULL,
  total_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'NGN',
  status TEXT DEFAULT 'pending',
  shipping_address JSONB,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ord_sel" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ord_ins" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ord_adm" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- shopping_cart
CREATE TABLE IF NOT EXISTS public.shopping_cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  remedy_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shopping_cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc_sel" ON public.shopping_cart FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sc_ins" ON public.shopping_cart FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sc_upd" ON public.shopping_cart FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sc_del" ON public.shopping_cart FOR DELETE USING (auth.uid() = user_id);

-- call_sessions
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  appointment_id UUID,
  call_type TEXT DEFAULT 'video',
  status TEXT DEFAULT 'initiated',
  channel_name TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_sel" ON public.call_sessions FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
CREATE POLICY "cs_ins" ON public.call_sessions FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "cs_upd" ON public.call_sessions FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- call_logs
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.call_sessions(id),
  user_id UUID NOT NULL,
  event TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cl_sel" ON public.call_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cl_ins" ON public.call_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- home_visit_requests
CREATE TABLE IF NOT EXISTS public.home_visit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  appointment_id UUID,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.home_visit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hvr_patient" ON public.home_visit_requests FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "hvr_doctor" ON public.home_visit_requests FOR ALL USING (auth.uid() = doctor_id);
CREATE POLICY "hvr_ins" ON public.home_visit_requests FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- wellness_check_results
CREATE TABLE IF NOT EXISTS public.wellness_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  check_type TEXT NOT NULL,
  results JSONB,
  score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wellness_check_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wcr_sel" ON public.wellness_check_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wcr_ins" ON public.wellness_check_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- symptoms
CREATE TABLE IF NOT EXISTS public.symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sym_pub" ON public.symptoms FOR SELECT USING (true);

-- conditions
CREATE TABLE IF NOT EXISTS public.conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  severity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cond_pub" ON public.conditions FOR SELECT USING (true);

-- drugs
CREATE TABLE IF NOT EXISTS public.drugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT,
  description TEXT,
  dosage_form TEXT,
  manufacturer TEXT,
  requires_prescription BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.drugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drugs_pub" ON public.drugs FOR SELECT USING (true);
CREATE POLICY "drugs_adm" ON public.drugs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- patient_prescriptions
CREATE TABLE IF NOT EXISTS public.patient_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  prescription_id UUID,
  drug_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pp_patient" ON public.patient_prescriptions FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "pp_doctor" ON public.patient_prescriptions FOR ALL USING (auth.uid() = doctor_id);

-- pending_drug_approvals
CREATE TABLE IF NOT EXISTS public.pending_drug_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  drug_name TEXT NOT NULL,
  dosage TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pending_drug_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pda_doctor" ON public.pending_drug_approvals FOR ALL USING (auth.uid() = doctor_id);
CREATE POLICY "pda_patient" ON public.pending_drug_approvals FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "pda_adm" ON public.pending_drug_approvals FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- recent_activities
CREATE TABLE IF NOT EXISTS public.recent_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recent_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ra_sel" ON public.recent_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ra_ins" ON public.recent_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- clarifying_questions (for AI diagnosis)
CREATE TABLE IF NOT EXISTS public.clarifying_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clarifying_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cq_sel" ON public.clarifying_questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cq_ins" ON public.clarifying_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cq_upd" ON public.clarifying_questions FOR UPDATE USING (auth.uid() = user_id);

-- chat_sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_type TEXT DEFAULT 'ai_companion',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chats_sel" ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chats_ins" ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chats_upd" ON public.chat_sessions FOR UPDATE USING (auth.uid() = user_id);

-- chats (messages within chat_sessions)
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.chat_sessions(id),
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ch_sel" ON public.chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ch_ins" ON public.chats FOR INSERT WITH CHECK (auth.uid() = user_id);

-- herbal_article_audit
CREATE TABLE IF NOT EXISTS public.herbal_article_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID,
  action TEXT NOT NULL,
  admin_id UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.herbal_article_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "haa_adm" ON public.herbal_article_audit FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- herbal_remedy_audit
CREATE TABLE IF NOT EXISTS public.herbal_remedy_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remedy_id UUID,
  action TEXT NOT NULL,
  admin_id UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.herbal_remedy_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hra_adm" ON public.herbal_remedy_audit FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- prescriptions_v2 (enhanced prescriptions)
CREATE TABLE IF NOT EXISTS public.prescriptions_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  appointment_id UUID,
  medications JSONB NOT NULL DEFAULT '[]',
  diagnosis TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rxv2_patient" ON public.prescriptions_v2 FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "rxv2_doctor" ON public.prescriptions_v2 FOR ALL USING (auth.uid() = doctor_id);

-- patients (doctor's patient list)
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, patient_id)
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pat_doc" ON public.patients FOR ALL USING (auth.uid() = doctor_id);
CREATE POLICY "pat_patient" ON public.patients FOR SELECT USING (auth.uid() = patient_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;

-- Storage buckets for chat files
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "chat_files_sel" ON storage.objects FOR SELECT USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "chat_files_ins" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "blog_images_sel" ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');
CREATE POLICY "blog_images_ins" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'blog-images' AND auth.role() = 'authenticated');
