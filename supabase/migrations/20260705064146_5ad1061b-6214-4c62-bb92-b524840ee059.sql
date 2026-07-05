
-- 1. Remove wallet feature
DROP FUNCTION IF EXISTS public.credit_wallet(uuid, bigint, wallet_txn_type, text, text, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.debit_wallet(uuid, bigint, wallet_txn_type, uuid, text, jsonb);
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.wallet_virtual_accounts CASCADE;
DROP TABLE IF EXISTS public.hitchpay_events CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TYPE IF EXISTS public.wallet_txn_type CASCADE;
DROP TYPE IF EXISTS public.wallet_txn_direction CASCADE;
DROP TYPE IF EXISTS public.wallet_status CASCADE;

-- 2. Fix Secret Chats PIN functions (pgcrypto lives in extensions schema)
CREATE OR REPLACE FUNCTION public.set_secret_pin(_pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, extensions
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _pin IS NULL OR length(_pin) < 4 OR length(_pin) > 12 THEN RAISE EXCEPTION 'invalid pin'; END IF;
  INSERT INTO public.women_secret_pin(user_id, pin_hash)
  VALUES (auth.uid(), extensions.crypt(_pin, extensions.gen_salt('bf', 10)))
  ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now();
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_secret_pin(_pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, extensions
AS $function$
DECLARE h TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  SELECT pin_hash INTO h FROM public.women_secret_pin WHERE user_id = auth.uid();
  IF h IS NULL THEN RETURN FALSE; END IF;
  RETURN h = extensions.crypt(_pin, h);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_secret_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_secret_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_secret_pin() TO authenticated;
