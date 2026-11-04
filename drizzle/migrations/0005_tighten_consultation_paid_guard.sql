-- A signed-in caller may only move a session to 'paid' through the free-access path.
-- Real payments confirm the session with elevated (platform) credentials.
CREATE OR REPLACE FUNCTION public.guard_consultation_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_legacy boolean;
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' AND auth.uid() IS NOT NULL THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      SELECT COALESCE(is_legacy, false) INTO v_legacy FROM public.profiles WHERE user_id = auth.uid();
      IF NOT (COALESCE(v_legacy, false) AND NEW.payment_method = 'free_access') THEN
        RAISE EXCEPTION 'Payment confirmation is handled by the platform';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
