-- 1) Patients can no longer insert completed consultation payments themselves.
-- Paid records are created only by platform functions running with elevated credentials.
DROP POLICY IF EXISTS cp_ins ON public.consultation_payments;
CREATE POLICY cp_ins_pending ON public.consultation_payments
  FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid() AND status IN ('pending', 'processing', 'initiated', 'failed'));

-- 2) Doctor verification status may only be changed by admins or the platform.
CREATE OR REPLACE FUNCTION public.guard_doctor_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.verification_status <> 'pending')
     OR (TG_OP = 'UPDATE' AND NEW.verification_status IS DISTINCT FROM OLD.verification_status) THEN
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only administrators can change doctor verification status';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_doctor_verification ON public.doctors;
CREATE TRIGGER trg_guard_doctor_verification
BEFORE INSERT OR UPDATE ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.guard_doctor_verification();

-- 3) Profile roles are managed by the platform, not by the account holder.
CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(current_setting('app.role_sync', true), '') <> 'on'
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Role changes are managed by the platform';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_profile_role ON public.profiles;
CREATE TRIGGER trg_guard_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role();

-- The platform role-sync trigger marks itself so its own role change is allowed.
CREATE OR REPLACE FUNCTION public.sync_doctor_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  PERFORM set_config('app.role_sync', 'on', true);
  UPDATE public.profiles
     SET role = 'doctor'
   WHERE user_id = NEW.user_id
     AND COALESCE(role, '') <> 'doctor';
  RETURN NEW;
END;
$function$;

-- 4) A paid consultation can be unlocked only by the platform payment flow
--    (or by a legacy free-access account or an admin).
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
    SELECT COALESCE(is_legacy, false) INTO v_legacy FROM public.profiles WHERE user_id = auth.uid();
    IF NOT COALESCE(v_legacy, false) AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Payment confirmation is handled by the platform';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_consultation_paid ON public.consultation_sessions;
CREATE TRIGGER trg_guard_consultation_paid
BEFORE UPDATE ON public.consultation_sessions
FOR EACH ROW EXECUTE FUNCTION public.guard_consultation_paid();

-- 5) Sign-up metadata may not grant elevated roles; only patient-level roles are accepted.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name, phone, role)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name',''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',''),
    COALESCE(NEW.raw_user_meta_data->>'phone',''),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role','') IN ('user','patient')
      THEN COALESCE(NEW.raw_user_meta_data->>'role','user')
      ELSE 'user'
    END);
  RETURN NEW;
END;
$function$;
