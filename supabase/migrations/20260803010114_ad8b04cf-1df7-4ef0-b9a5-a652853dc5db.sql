
ALTER TABLE public.consultation_sessions ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS womens_health_access boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.women_partner_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  partner_email text NOT NULL,
  partner_user_id uuid,
  status text NOT NULL DEFAULT 'active',
  can_view_cycle boolean NOT NULL DEFAULT true,
  can_view_symptoms boolean NOT NULL DEFAULT true,
  can_view_pregnancy boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, partner_email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.women_partner_access TO authenticated;
GRANT ALL ON public.women_partner_access TO service_role;

ALTER TABLE public.women_partner_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their partner access"
  ON public.women_partner_access FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Partners can view their invitations"
  ON public.women_partner_access FOR SELECT TO authenticated
  USING (
    partner_user_id = auth.uid()
    OR lower(partner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

CREATE TRIGGER women_partner_access_updated_at
  BEFORE UPDATE ON public.women_partner_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.can_view_women_data(_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    _owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.women_partner_access wpa
      WHERE wpa.owner_id = _owner
        AND wpa.status = 'active'
        AND (
          wpa.partner_user_id = auth.uid()
          OR lower(wpa.partner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  )
$$;

GRANT EXECUTE ON FUNCTION public.can_view_women_data(uuid) TO authenticated;

CREATE POLICY "Partners can view women profile"
  ON public.women_profiles FOR SELECT TO authenticated
  USING (public.can_view_women_data(user_id));

CREATE POLICY "Partners can view daily log"
  ON public.women_daily_log FOR SELECT TO authenticated
  USING (public.can_view_women_data(user_id));

CREATE POLICY "Partners can view cycle records"
  ON public.cycle_records FOR SELECT TO authenticated
  USING (public.can_view_women_data(user_id));

CREATE POLICY "Partners can view period logs"
  ON public.period_logs FOR SELECT TO authenticated
  USING (public.can_view_women_data(user_id));

CREATE POLICY "Partners can view symptom logs"
  ON public.symptom_logs FOR SELECT TO authenticated
  USING (public.can_view_women_data(user_id));

CREATE POLICY "Partners can view fertility predictions"
  ON public.fertility_predictions FOR SELECT TO authenticated
  USING (public.can_view_women_data(user_id));

CREATE POLICY "Partners can view pregnancy profile"
  ON public.pregnancy_profiles FOR SELECT TO authenticated
  USING (public.can_view_women_data(user_id));

CREATE POLICY "Partners can view pregnancy logs"
  ON public.pregnancy_logs FOR SELECT TO authenticated
  USING (public.can_view_women_data(user_id));
