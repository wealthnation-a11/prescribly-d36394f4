-- Helper: does the current user own a pharmacy that has an order from this patient?
CREATE OR REPLACE FUNCTION public.pharmacy_serves_patient(_patient uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pharmacy_orders o
    JOIN public.pharmacies p ON p.id = o.pharmacy_id
    WHERE o.patient_id = _patient
      AND p.owner_user_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.pharmacy_serves_patient(uuid) TO authenticated;

-- Pharmacies can read the profile of patients who ordered from them
DROP POLICY IF EXISTS profiles_pharmacy_select ON public.profiles;
CREATE POLICY profiles_pharmacy_select
ON public.profiles
FOR SELECT
TO authenticated
USING (public.pharmacy_serves_patient(user_id));

-- Pharmacies can read the prescription attached to an order they received
DROP POLICY IF EXISTS rx_pharmacy_select ON public.prescriptions;
CREATE POLICY rx_pharmacy_select
ON public.prescriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pharmacy_orders o
    WHERE o.prescription_id = prescriptions.id
      AND public.is_pharmacy_owner(o.pharmacy_id)
  )
);

-- Chat: force sender identity for patients too
DROP POLICY IF EXISTS pm_owner_insert ON public.pharmacy_messages;
CREATE POLICY pm_owner_insert
ON public.pharmacy_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.pharmacy_orders o
    WHERE o.id = pharmacy_messages.order_id
      AND o.patient_id = auth.uid()
  )
);
