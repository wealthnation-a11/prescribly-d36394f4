CREATE TABLE public.logistics_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  registration_number text,
  coverage_areas text,
  description text,
  status text NOT NULL DEFAULT 'pending',
  is_active boolean NOT NULL DEFAULT false,
  admin_notes text,
  rating numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.logistics_companies TO authenticated;
GRANT ALL ON public.logistics_companies TO service_role;
ALTER TABLE public.logistics_companies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_logistics_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id FROM public.logistics_companies l WHERE l.owner_user_id = auth.uid() LIMIT 1
$$;

CREATE POLICY lc_owner_read ON public.logistics_companies FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
         OR (status = 'approved' AND is_active = true));
CREATE POLICY lc_owner_insert ON public.logistics_companies FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY lc_owner_update ON public.logistics_companies FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_logistics_companies_updated BEFORE UPDATE ON public.logistics_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.pharmacy_orders(id) ON DELETE CASCADE,
  pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  logistics_company_id uuid REFERENCES public.logistics_companies(id) ON DELETE SET NULL,
  patient_id uuid,
  pickup_address text,
  delivery_address text,
  recipient_name text,
  recipient_phone text,
  delivery_fee numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  rider_name text,
  rider_phone text,
  notes text,
  assigned_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_orders_company ON public.delivery_orders(logistics_company_id);
CREATE INDEX idx_delivery_orders_pharmacy ON public.delivery_orders(pharmacy_id);

GRANT SELECT, INSERT, UPDATE ON public.delivery_orders TO authenticated;
GRANT ALL ON public.delivery_orders TO service_role;
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY do_read ON public.delivery_orders FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR public.is_pharmacy_owner(pharmacy_id)
    OR (logistics_company_id IS NOT NULL AND logistics_company_id = public.my_logistics_company_id())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY do_insert ON public.delivery_orders FOR INSERT TO authenticated
  WITH CHECK (public.is_pharmacy_owner(pharmacy_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY do_update ON public.delivery_orders FOR UPDATE TO authenticated
  USING (
    public.is_pharmacy_owner(pharmacy_id)
    OR (logistics_company_id IS NOT NULL AND logistics_company_id = public.my_logistics_company_id())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_pharmacy_owner(pharmacy_id)
    OR (logistics_company_id IS NOT NULL AND logistics_company_id = public.my_logistics_company_id())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_delivery_orders_updated BEFORE UPDATE ON public.delivery_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();