CREATE TABLE public.pharmacy_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  drug_name text NOT NULL,
  generic_name text,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity_available integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pharmacy_id, drug_name)
);

GRANT SELECT ON public.pharmacy_inventory TO anon;
GRANT SELECT ON public.pharmacy_inventory TO authenticated;
GRANT ALL ON public.pharmacy_inventory TO service_role;

ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view inventory of active pharmacies"
ON public.pharmacy_inventory FOR SELECT
USING (EXISTS (SELECT 1 FROM public.pharmacies p WHERE p.id = pharmacy_id AND p.is_active));

CREATE POLICY "Admins manage inventory"
ON public.pharmacy_inventory FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_pharmacy_inventory_pharmacy ON public.pharmacy_inventory(pharmacy_id);
CREATE INDEX idx_pharmacy_inventory_drug ON public.pharmacy_inventory(lower(drug_name));

CREATE TRIGGER update_pharmacy_inventory_updated_at
BEFORE UPDATE ON public.pharmacy_inventory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();