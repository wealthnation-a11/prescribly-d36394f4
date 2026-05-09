
-- Ensure user_id is required & not nullable
ALTER TABLE public.drug_reminders ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.hydration_slots ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.medication_doses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.meditation_sessions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.user_steps ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.user_sleep_log ALTER COLUMN user_id SET NOT NULL;

-- Force RLS even for table owners
ALTER TABLE public.drug_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_doses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meditation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sleep_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.drug_reminders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_slots FORCE ROW LEVEL SECURITY;
ALTER TABLE public.medication_doses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.meditation_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_steps FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_sleep_log FORCE ROW LEVEL SECURITY;

-- Drop old loose policies
DROP POLICY IF EXISTS dr_own ON public.drug_reminders;
DROP POLICY IF EXISTS hs_own ON public.hydration_slots;
DROP POLICY IF EXISTS hs_adm ON public.hydration_slots;
DROP POLICY IF EXISTS md_own ON public.medication_doses;
DROP POLICY IF EXISTS md_adm ON public.medication_doses;
DROP POLICY IF EXISTS ms_own ON public.meditation_sessions;
DROP POLICY IF EXISTS ms_adm ON public.meditation_sessions;

-- Helper policy template (owner-only, authenticated, plus admin SELECT)
-- drug_reminders
CREATE POLICY drug_reminders_select ON public.drug_reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY drug_reminders_insert ON public.drug_reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY drug_reminders_update ON public.drug_reminders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY drug_reminders_delete ON public.drug_reminders FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY drug_reminders_admin_select ON public.drug_reminders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- hydration_slots
CREATE POLICY hydration_slots_select ON public.hydration_slots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY hydration_slots_insert ON public.hydration_slots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY hydration_slots_update ON public.hydration_slots FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY hydration_slots_delete ON public.hydration_slots FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY hydration_slots_admin_select ON public.hydration_slots FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- medication_doses
CREATE POLICY medication_doses_select ON public.medication_doses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY medication_doses_insert ON public.medication_doses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY medication_doses_update ON public.medication_doses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY medication_doses_delete ON public.medication_doses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY medication_doses_admin_select ON public.medication_doses FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- meditation_sessions
CREATE POLICY meditation_sessions_select ON public.meditation_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY meditation_sessions_insert ON public.meditation_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY meditation_sessions_update ON public.meditation_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY meditation_sessions_delete ON public.meditation_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY meditation_sessions_admin_select ON public.meditation_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- user_steps  (drop any preexisting permissive policies first)
DO $$ DECLARE p text; BEGIN
  FOR p IN SELECT polname FROM pg_policy WHERE polrelid='public.user_steps'::regclass LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_steps', p);
  END LOOP;
END $$;
CREATE POLICY user_steps_select ON public.user_steps FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY user_steps_insert ON public.user_steps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_steps_update ON public.user_steps FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_steps_delete ON public.user_steps FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY user_steps_admin_select ON public.user_steps FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- user_sleep_log
DO $$ DECLARE p text; BEGIN
  FOR p IN SELECT polname FROM pg_policy WHERE polrelid='public.user_sleep_log'::regclass LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_sleep_log', p);
  END LOOP;
END $$;
CREATE POLICY user_sleep_select ON public.user_sleep_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY user_sleep_insert ON public.user_sleep_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_sleep_update ON public.user_sleep_log FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_sleep_delete ON public.user_sleep_log FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY user_sleep_admin_select ON public.user_sleep_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Explicit deny to anon (defense in depth)
REVOKE ALL ON public.drug_reminders FROM anon;
REVOKE ALL ON public.hydration_slots FROM anon;
REVOKE ALL ON public.medication_doses FROM anon;
REVOKE ALL ON public.meditation_sessions FROM anon;
REVOKE ALL ON public.user_steps FROM anon;
REVOKE ALL ON public.user_sleep_log FROM anon;
