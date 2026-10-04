-- 1. Sync logistics updates to pharmacy orders
CREATE OR REPLACE FUNCTION public.sync_delivery_to_pharmacy_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _st text;
BEGIN
  _st := CASE NEW.status
    WHEN 'picked_up' THEN 'dispatched'
    WHEN 'in_transit' THEN 'dispatched'
    WHEN 'delivered' THEN 'delivered'
    ELSE NULL END;
  UPDATE public.pharmacy_orders
     SET rider_name = COALESCE(NEW.rider_name, rider_name),
         rider_phone = COALESCE(NEW.rider_phone, rider_phone),
         status = COALESCE(_st, status)
   WHERE id = NEW.order_id;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.sync_delivery_to_pharmacy_order() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_delivery_to_order ON public.delivery_orders;
CREATE TRIGGER trg_sync_delivery_to_order AFTER INSERT OR UPDATE ON public.delivery_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_delivery_to_pharmacy_order();

-- 2. Fallback daily questions
CREATE OR REPLACE FUNCTION public.get_daily_questions_for_user(user_uuid uuid)
RETURNS TABLE(id uuid, question_text text, category text, options jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> user_uuid THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM public.daily_questions WHERE is_active) THEN
    RETURN QUERY SELECT q.id, q.question, q.category, q.options
      FROM public.daily_questions q WHERE q.is_active
      ORDER BY md5(q.id::text || CURRENT_DATE::text) LIMIT 5;
  ELSE
    RETURN QUERY SELECT gen_random_uuid(), v.q, v.c, v.o::jsonb FROM (VALUES
      ('How many glasses of water have you had today?','hydration','["0-2","3-5","6-8","More than 8"]'),
      ('How would you rate your mood today?','mood','["Great","Good","Okay","Low"]'),
      ('How well did you sleep last night?','sleep','["Very well","Fairly well","Poorly","Hardly slept"]'),
      ('Did you eat fruits or vegetables today?','nutrition','["Yes, several times","Once","Not yet"]'),
      ('How active have you been today?','activity','["Very active","Some walking","Mostly sitting"]')
    ) AS v(q,c,o);
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.get_daily_questions_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_questions_for_user(uuid) TO authenticated, service_role;

-- 3. Lab result scans
CREATE TABLE public.medical_result_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text,
  status text NOT NULL DEFAULT 'processing',
  summary_teaser text,
  findings_count int DEFAULT 0,
  flagged_count int DEFAULT 0,
  interpretation_json jsonb,
  payment_reference text,
  amount numeric NOT NULL DEFAULT 4500,
  error_message text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id,user_id,file_path,file_name,status,summary_teaser,findings_count,flagged_count,payment_reference,amount,error_message,paid_at,created_at,updated_at)
  ON public.medical_result_scans TO authenticated;
GRANT ALL ON public.medical_result_scans TO service_role;
ALTER TABLE public.medical_result_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY mrs_owner_read ON public.medical_result_scans FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_mrs_updated BEFORE UPDATE ON public.medical_result_scans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_scan_report(_scan_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.medical_result_scans;
BEGIN
  SELECT * INTO r FROM public.medical_result_scans WHERE id = _scan_id;
  IF r.id IS NULL OR (r.user_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF r.status <> 'paid' THEN RAISE EXCEPTION 'payment required'; END IF;
  RETURN r.interpretation_json;
END; $$;
REVOKE ALL ON FUNCTION public.get_scan_report(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_scan_report(uuid) TO authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_result_scans;