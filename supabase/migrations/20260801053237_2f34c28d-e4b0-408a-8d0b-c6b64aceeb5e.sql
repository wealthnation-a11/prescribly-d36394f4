
-- CONSULTATION SESSIONS
CREATE TABLE public.consultation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  doctor_id uuid,
  consult_type text NOT NULL DEFAULT 'talk_now',
  mode text NOT NULL DEFAULT 'chat',
  symptoms text,
  duration_answer text,
  severity int,
  other_symptoms text[] DEFAULT '{}',
  conditions text[] DEFAULT '{}',
  is_emergency boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  fee numeric NOT NULL DEFAULT 3500,
  payment_reference text,
  payment_method text,
  started_at timestamptz,
  ends_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.consultation_sessions TO authenticated;
GRANT ALL ON public.consultation_sessions TO service_role;
ALTER TABLE public.consultation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_patient_all" ON public.consultation_sessions FOR ALL TO authenticated
  USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());
CREATE POLICY "cs_doctor_select" ON public.consultation_sessions FOR SELECT TO authenticated
  USING (doctor_id = auth.uid());
CREATE POLICY "cs_doctor_update" ON public.consultation_sessions FOR UPDATE TO authenticated
  USING (doctor_id = auth.uid()) WITH CHECK (doctor_id = auth.uid());
CREATE POLICY "cs_admin_all" ON public.consultation_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_cs_updated BEFORE UPDATE ON public.consultation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_cs_patient ON public.consultation_sessions(patient_id);
CREATE INDEX idx_cs_doctor ON public.consultation_sessions(doctor_id);

-- CONSULTATION MESSAGES
CREATE TABLE public.consultation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.consultation_sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL DEFAULT 'patient',
  message_type text NOT NULL DEFAULT 'text',
  content text,
  image_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.consultation_messages TO authenticated;
GRANT ALL ON public.consultation_messages TO service_role;
ALTER TABLE public.consultation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm_participant_select" ON public.consultation_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.consultation_sessions s WHERE s.id = session_id
    AND (s.patient_id = auth.uid() OR s.doctor_id = auth.uid())));
CREATE POLICY "cm_participant_insert" ON public.consultation_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.consultation_sessions s WHERE s.id = session_id
    AND (s.patient_id = auth.uid() OR s.doctor_id = auth.uid())));
CREATE POLICY "cm_participant_update" ON public.consultation_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.consultation_sessions s WHERE s.id = session_id
    AND (s.patient_id = auth.uid() OR s.doctor_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.consultation_sessions s WHERE s.id = session_id
    AND (s.patient_id = auth.uid() OR s.doctor_id = auth.uid())));
CREATE INDEX idx_cm_session ON public.consultation_messages(session_id, created_at);

-- CALL SIGNALS
CREATE TABLE public.consultation_call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.consultation_sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  signal_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.consultation_call_signals TO authenticated;
GRANT ALL ON public.consultation_call_signals TO service_role;
ALTER TABLE public.consultation_call_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sig_participant_select" ON public.consultation_call_signals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.consultation_sessions s WHERE s.id = session_id
    AND (s.patient_id = auth.uid() OR s.doctor_id = auth.uid())));
CREATE POLICY "sig_participant_insert" ON public.consultation_call_signals FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.consultation_sessions s WHERE s.id = session_id
    AND (s.patient_id = auth.uid() OR s.doctor_id = auth.uid())));
CREATE POLICY "sig_participant_delete" ON public.consultation_call_signals FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- PHARMACIES
CREATE TABLE public.pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  rating numeric DEFAULT 0,
  review_count int DEFAULT 0,
  delivery_eta text,
  stock_status text DEFAULT 'full',
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pharmacies TO authenticated;
GRANT ALL ON public.pharmacies TO service_role;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ph_auth_select" ON public.pharmacies FOR SELECT TO authenticated USING (is_active);
CREATE POLICY "ph_admin_all" ON public.pharmacies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ph_updated BEFORE UPDATE ON public.pharmacies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PHARMACY ORDERS
CREATE TABLE public.pharmacy_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  pharmacy_id uuid REFERENCES public.pharmacies(id) ON DELETE SET NULL,
  prescription_id uuid,
  session_id uuid,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,
  delivery_address text,
  status text NOT NULL DEFAULT 'placed',
  rider_name text,
  rider_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.pharmacy_orders TO authenticated;
GRANT ALL ON public.pharmacy_orders TO service_role;
ALTER TABLE public.pharmacy_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_patient_all" ON public.pharmacy_orders FOR ALL TO authenticated
  USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());
CREATE POLICY "po_admin_all" ON public.pharmacy_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.pharmacy_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PHARMACY MESSAGES
CREATE TABLE public.pharmacy_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.pharmacy_orders(id) ON DELETE CASCADE,
  sender_id uuid,
  sender_role text NOT NULL DEFAULT 'patient',
  message_type text NOT NULL DEFAULT 'text',
  content text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.pharmacy_messages TO authenticated;
GRANT ALL ON public.pharmacy_messages TO service_role;
ALTER TABLE public.pharmacy_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_owner_select" ON public.pharmacy_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pharmacy_orders o WHERE o.id = order_id AND o.patient_id = auth.uid()));
CREATE POLICY "pm_owner_insert" ON public.pharmacy_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.pharmacy_orders o WHERE o.id = order_id AND o.patient_id = auth.uid()));
CREATE POLICY "pm_admin_all" ON public.pharmacy_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_pm_order ON public.pharmacy_messages(order_id, created_at);

-- LAB ORDERS (UI phase)
CREATE TABLE public.lab_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  session_id uuid,
  test_name text NOT NULL,
  status text NOT NULL DEFAULT 'ordered',
  ordered_at timestamptz NOT NULL DEFAULT now(),
  collected_at timestamptz,
  in_progress_at timestamptz,
  completed_at timestamptz,
  result_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.lab_orders TO authenticated;
GRANT ALL ON public.lab_orders TO service_role;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lo_patient_all" ON public.lab_orders FOR ALL TO authenticated
  USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());
CREATE POLICY "lo_admin_all" ON public.lab_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_lo_updated BEFORE UPDATE ON public.lab_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.consultation_messages REPLICA IDENTITY FULL;
ALTER TABLE public.consultation_call_signals REPLICA IDENTITY FULL;
ALTER TABLE public.pharmacy_messages REPLICA IDENTITY FULL;
ALTER TABLE public.pharmacy_orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_call_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacy_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pharmacy_orders;

-- Seed partner pharmacies
INSERT INTO public.pharmacies (name, address, city, rating, review_count, delivery_eta, stock_status, phone) VALUES
  ('HealthPlus Pharmacy', '12 Allen Avenue, Ikeja', 'Lagos', 4.8, 214, '45 mins', 'full', '+2348000000001'),
  ('MedPlus Pharmacy', '5 Adeniran Ogunsanya, Surulere', 'Lagos', 4.6, 158, '1 hr', 'full', '+2348000000002'),
  ('Alpha Pharmacy', '30 Awolowo Road, Ikoyi', 'Lagos', 4.4, 96, '1 hr 20 mins', 'partial', '+2348000000003');
