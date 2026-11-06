CREATE TABLE public.doctor_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  patient_id uuid,
  session_id uuid NOT NULL UNIQUE,
  patient_payment numeric NOT NULL DEFAULT 0,
  doctor_earnings numeric NOT NULL DEFAULT 1500,
  admin_fee numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  earned_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.doctor_earnings TO authenticated;
GRANT ALL ON public.doctor_earnings TO service_role;
ALTER TABLE public.doctor_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors view own earnings" ON public.doctor_earnings FOR SELECT TO authenticated USING (doctor_id = auth.uid());
CREATE POLICY "Admins view all earnings" ON public.doctor_earnings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_doctor_earnings_doctor ON public.doctor_earnings(doctor_id, earned_at DESC);

CREATE OR REPLACE FUNCTION public.record_doctor_earning()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.doctor_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO public.doctor_earnings (doctor_id, patient_id, session_id, patient_payment, doctor_earnings, admin_fee, earned_at)
    VALUES (NEW.doctor_id, NEW.patient_id, NEW.id, COALESCE(NEW.fee, 0), 1500, COALESCE(NEW.fee, 0) - 1500, COALESCE(NEW.ended_at, now()))
    ON CONFLICT (session_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_doctor_earning() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_record_doctor_earning
AFTER INSERT OR UPDATE OF status ON public.consultation_sessions
FOR EACH ROW EXECUTE FUNCTION public.record_doctor_earning();

INSERT INTO public.doctor_earnings (doctor_id, patient_id, session_id, patient_payment, doctor_earnings, admin_fee, earned_at)
SELECT doctor_id, patient_id, id, COALESCE(fee,0), 1500, COALESCE(fee,0) - 1500, COALESCE(ended_at, updated_at, created_at)
FROM public.consultation_sessions WHERE status = 'completed' AND doctor_id IS NOT NULL
ON CONFLICT (session_id) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_earnings;