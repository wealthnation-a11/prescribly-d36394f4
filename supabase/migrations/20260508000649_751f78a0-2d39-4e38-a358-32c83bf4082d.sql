
-- =========================================================
-- Hydration slots (per-glass schedule + adherence)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.hydration_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  slot_index integer NOT NULL,
  scheduled_at timestamptz NOT NULL,
  ml integer NOT NULL DEFAULT 250,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','taken','missed','skipped')),
  taken_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date, slot_index)
);
CREATE INDEX IF NOT EXISTS idx_hydration_slots_user_date ON public.hydration_slots(user_id, log_date);
ALTER TABLE public.hydration_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY hs_own ON public.hydration_slots
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY hs_adm ON public.hydration_slots
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_hydration_slots_updated BEFORE UPDATE ON public.hydration_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Persist liter goal on user_hydration_log
ALTER TABLE public.user_hydration_log
  ADD COLUMN IF NOT EXISTS goal_liters numeric NOT NULL DEFAULT 2;

-- =========================================================
-- Medication adherence history (per dose fire)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.medication_doses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reminder_id uuid REFERENCES public.drug_reminders(id) ON DELETE SET NULL,
  drug_name text NOT NULL,
  dosage text,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','taken','missed','skipped')),
  dose_change integer NOT NULL DEFAULT 0,
  notes text,
  taken_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_med_doses_user_time ON public.medication_doses(user_id, scheduled_at DESC);
ALTER TABLE public.medication_doses ENABLE ROW LEVEL SECURITY;

CREATE POLICY md_own ON public.medication_doses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY md_adm ON public.medication_doses
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_med_doses_updated BEFORE UPDATE ON public.medication_doses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- updated_at + trigger on drug_reminders
ALTER TABLE public.drug_reminders
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS trg_drug_reminders_updated ON public.drug_reminders;
CREATE TRIGGER trg_drug_reminders_updated BEFORE UPDATE ON public.drug_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Meditation sessions
-- =========================================================
CREATE TABLE IF NOT EXISTS public.meditation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  planned_minutes integer NOT NULL,
  actual_minutes integer,
  completed boolean NOT NULL DEFAULT false,
  sound_id text,
  points_change integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meditation_user_time ON public.meditation_sessions(user_id, started_at DESC);
ALTER TABLE public.meditation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ms_own ON public.meditation_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY ms_adm ON public.meditation_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- End-of-day summary
-- =========================================================
CREATE TABLE IF NOT EXISTS public.wellness_eod_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  summary_date date NOT NULL DEFAULT CURRENT_DATE,
  total_score integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  points_lost integer NOT NULL DEFAULT 0,
  water_taken integer NOT NULL DEFAULT 0,
  water_missed integer NOT NULL DEFAULT 0,
  meds_taken integer NOT NULL DEFAULT 0,
  meds_missed integer NOT NULL DEFAULT 0,
  meditation_minutes integer NOT NULL DEFAULT 0,
  steps integer NOT NULL DEFAULT 0,
  sleep_hours numeric NOT NULL DEFAULT 0,
  in_app_sent boolean NOT NULL DEFAULT false,
  email_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, summary_date)
);
ALTER TABLE public.wellness_eod_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY eod_own ON public.wellness_eod_summary
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY eod_adm ON public.wellness_eod_summary
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY eod_srv_ins ON public.wellness_eod_summary
  FOR INSERT TO authenticated, anon
  WITH CHECK ((auth.uid() = user_id) OR (auth.role() = 'service_role'));
CREATE POLICY eod_srv_upd ON public.wellness_eod_summary
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- =========================================================
-- Alarm queue (read by service worker for background fires)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.wellness_alarm_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('water','medication','sleep','meditation')),
  ref_id uuid,
  title text NOT NULL,
  body text NOT NULL,
  fire_at timestamptz NOT NULL,
  fired boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alarm_queue_user_time ON public.wellness_alarm_queue(user_id, fire_at);
ALTER TABLE public.wellness_alarm_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY waq_own ON public.wellness_alarm_queue
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- Function hardening (search_path) on existing functions
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name, phone, role)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name',''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',''),
    COALESCE(NEW.raw_user_meta_data->>'phone',''),
    COALESCE(NEW.raw_user_meta_data->>'role','user'));
  RETURN NEW;
END; $$;

-- =========================================================
-- compute_eod_summary RPC (idempotent per day, owner-only)
-- =========================================================
CREATE OR REPLACE FUNCTION public.compute_eod_summary(_user_id uuid, _date date DEFAULT CURRENT_DATE)
RETURNS public.wellness_eod_summary
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_water_taken int := 0; v_water_missed int := 0;
  v_meds_taken int := 0; v_meds_missed int := 0;
  v_med_min int := 0; v_steps int := 0; v_sleep numeric := 0;
  v_earned int := 0; v_lost int := 0; v_score int := 0;
  v_row public.wellness_eod_summary;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _user_id AND NOT public.has_role(auth.uid(),'admin') AND auth.role() <> 'service_role') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*) FILTER (WHERE status='taken'),
         COUNT(*) FILTER (WHERE status='missed')
    INTO v_water_taken, v_water_missed
    FROM public.hydration_slots WHERE user_id=_user_id AND log_date=_date;

  SELECT COUNT(*) FILTER (WHERE status='taken'),
         COUNT(*) FILTER (WHERE status='missed')
    INTO v_meds_taken, v_meds_missed
    FROM public.medication_doses
    WHERE user_id=_user_id AND scheduled_at::date=_date;

  SELECT COALESCE(SUM(actual_minutes) FILTER (WHERE completed),0),
         COALESCE(SUM(points_change) FILTER (WHERE points_change > 0),0),
         COALESCE(-SUM(points_change) FILTER (WHERE points_change < 0),0)
    INTO v_med_min, v_earned, v_lost
    FROM public.meditation_sessions
    WHERE user_id=_user_id AND started_at::date=_date;

  SELECT COALESCE(steps,0) INTO v_steps FROM public.user_steps
    WHERE user_id=_user_id AND date=_date LIMIT 1;
  SELECT COALESCE(hours_slept,0) INTO v_sleep FROM public.user_sleep_log
    WHERE user_id=_user_id AND date=_date LIMIT 1;

  v_earned := v_earned + (v_water_taken * 2) + (v_meds_taken * 5) + (v_med_min) + LEAST(v_steps/1000, 20);
  v_lost := v_lost + (v_water_missed * 1) + (v_meds_missed * 5);
  v_score := v_earned - v_lost;

  INSERT INTO public.wellness_eod_summary (user_id, summary_date, total_score, points_earned, points_lost,
    water_taken, water_missed, meds_taken, meds_missed, meditation_minutes, steps, sleep_hours)
  VALUES (_user_id, _date, v_score, v_earned, v_lost, v_water_taken, v_water_missed, v_meds_taken, v_meds_missed, v_med_min, v_steps, v_sleep)
  ON CONFLICT (user_id, summary_date) DO UPDATE
    SET total_score=EXCLUDED.total_score, points_earned=EXCLUDED.points_earned, points_lost=EXCLUDED.points_lost,
        water_taken=EXCLUDED.water_taken, water_missed=EXCLUDED.water_missed,
        meds_taken=EXCLUDED.meds_taken, meds_missed=EXCLUDED.meds_missed,
        meditation_minutes=EXCLUDED.meditation_minutes, steps=EXCLUDED.steps, sleep_hours=EXCLUDED.sleep_hours
  RETURNING * INTO v_row;
  RETURN v_row;
END; $$;

REVOKE ALL ON FUNCTION public.compute_eod_summary(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_eod_summary(uuid, date) TO authenticated, service_role;
