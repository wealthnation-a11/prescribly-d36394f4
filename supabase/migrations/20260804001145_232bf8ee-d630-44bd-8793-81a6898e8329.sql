
-- 1. Extend pharmacies with ownership + approval workflow
ALTER TABLE public.pharmacies
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS opening_hours text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

UPDATE public.pharmacies SET status = 'approved' WHERE is_active IS TRUE AND status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS pharmacies_owner_user_id_key ON public.pharmacies(owner_user_id) WHERE owner_user_id IS NOT NULL;

-- 2. Helper: is the current user the owner of a pharmacy
CREATE OR REPLACE FUNCTION public.is_pharmacy_owner(_pharmacy_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacies p
    WHERE p.id = _pharmacy_id AND p.owner_user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.my_pharmacy_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id FROM public.pharmacies p WHERE p.owner_user_id = auth.uid() LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.is_pharmacy_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_pharmacy_id() TO authenticated;

-- 3. Reports about pharmacies
CREATE TABLE IF NOT EXISTS public.pharmacy_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  order_id uuid,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pharmacy_reports TO authenticated;
GRANT ALL ON public.pharmacy_reports TO service_role;
ALTER TABLE public.pharmacy_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pr_reporter_insert ON public.pharmacy_reports;
CREATE POLICY pr_reporter_insert ON public.pharmacy_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS pr_reporter_select ON public.pharmacy_reports;
CREATE POLICY pr_reporter_select ON public.pharmacy_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());
DROP POLICY IF EXISTS pr_admin_all ON public.pharmacy_reports;
CREATE POLICY pr_admin_all ON public.pharmacy_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_pharmacy_reports_updated ON public.pharmacy_reports;
CREATE TRIGGER trg_pharmacy_reports_updated BEFORE UPDATE ON public.pharmacy_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Pharmacies policies: owner self-service + patients only see approved
DROP POLICY IF EXISTS ph_auth_select ON public.pharmacies;
CREATE POLICY ph_auth_select ON public.pharmacies FOR SELECT TO authenticated
  USING ((is_active AND status = 'approved') OR owner_user_id = auth.uid());

DROP POLICY IF EXISTS ph_owner_insert ON public.pharmacies;
CREATE POLICY ph_owner_insert ON public.pharmacies FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS ph_owner_update ON public.pharmacies;
CREATE POLICY ph_owner_update ON public.pharmacies FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

-- 5. Inventory: owner manages their own price list
DROP POLICY IF EXISTS "Anyone can view inventory of active pharmacies" ON public.pharmacy_inventory;
CREATE POLICY pi_public_select ON public.pharmacy_inventory FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.id = pharmacy_id AND p.is_active AND p.status = 'approved'));

DROP POLICY IF EXISTS pi_owner_all ON public.pharmacy_inventory;
CREATE POLICY pi_owner_all ON public.pharmacy_inventory FOR ALL TO authenticated
  USING (public.is_pharmacy_owner(pharmacy_id)) WITH CHECK (public.is_pharmacy_owner(pharmacy_id));

-- 6. Orders: pharmacy owner sees/updates orders sent to them
DROP POLICY IF EXISTS po_pharmacy_select ON public.pharmacy_orders;
CREATE POLICY po_pharmacy_select ON public.pharmacy_orders FOR SELECT TO authenticated
  USING (public.is_pharmacy_owner(pharmacy_id));
DROP POLICY IF EXISTS po_pharmacy_update ON public.pharmacy_orders;
CREATE POLICY po_pharmacy_update ON public.pharmacy_orders FOR UPDATE TO authenticated
  USING (public.is_pharmacy_owner(pharmacy_id)) WITH CHECK (public.is_pharmacy_owner(pharmacy_id));

-- 7. Messages: pharmacy owner can chat on their orders
DROP POLICY IF EXISTS pm_pharmacy_select ON public.pharmacy_messages;
CREATE POLICY pm_pharmacy_select ON public.pharmacy_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pharmacy_orders o WHERE o.id = order_id AND public.is_pharmacy_owner(o.pharmacy_id)));
DROP POLICY IF EXISTS pm_pharmacy_insert ON public.pharmacy_messages;
CREATE POLICY pm_pharmacy_insert ON public.pharmacy_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.pharmacy_orders o WHERE o.id = order_id AND public.is_pharmacy_owner(o.pharmacy_id)));

-- 8. Realtime
ALTER TABLE public.pharmacy_messages REPLICA IDENTITY FULL;
ALTER TABLE public.pharmacy_orders REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacy_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacy_orders;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
