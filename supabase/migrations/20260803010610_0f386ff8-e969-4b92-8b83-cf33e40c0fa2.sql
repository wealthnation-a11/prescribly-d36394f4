CREATE OR REPLACE FUNCTION public.link_partner_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid;
BEGIN
  SELECT user_id INTO _uid FROM public.profiles
   WHERE lower(email) = lower(NEW.partner_email) LIMIT 1;
  IF _uid IS NOT NULL THEN
    NEW.partner_user_id := _uid;
    UPDATE public.profiles SET womens_health_access = true WHERE user_id = _uid;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_link_partner_access ON public.women_partner_access;
CREATE TRIGGER trg_link_partner_access
BEFORE INSERT ON public.women_partner_access
FOR EACH ROW EXECUTE FUNCTION public.link_partner_access();

CREATE OR REPLACE FUNCTION public.unlink_partner_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.partner_user_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.women_partner_access
        WHERE partner_user_id = OLD.partner_user_id AND id <> OLD.id
     ) THEN
    UPDATE public.profiles
       SET womens_health_access = false
     WHERE user_id = OLD.partner_user_id
       AND COALESCE(lower(gender), '') <> 'female';
  END IF;
  RETURN OLD;
END; $$;

DROP TRIGGER IF EXISTS trg_unlink_partner_access ON public.women_partner_access;
CREATE TRIGGER trg_unlink_partner_access
AFTER DELETE ON public.women_partner_access
FOR EACH ROW EXECUTE FUNCTION public.unlink_partner_access();

CREATE OR REPLACE FUNCTION public.claim_partner_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.women_partner_access
     SET partner_user_id = NEW.user_id
   WHERE partner_user_id IS NULL
     AND lower(partner_email) = lower(NEW.email);

  IF EXISTS (SELECT 1 FROM public.women_partner_access WHERE partner_user_id = NEW.user_id) THEN
    UPDATE public.profiles SET womens_health_access = true WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_claim_partner_invites ON public.profiles;
CREATE TRIGGER trg_claim_partner_invites
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.claim_partner_invites();