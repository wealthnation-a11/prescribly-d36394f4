
-- 1. Helper: is the given user an approved doctor?
CREATE OR REPLACE FUNCTION public.is_approved_doctor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.user_id = _user_id AND d.verification_status = 'approved'
  )
$$;

-- 2. Helper: do two users share a care relationship (appointment or consultation)?
CREATE OR REPLACE FUNCTION public.shares_care_relationship(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE (a.doctor_id = _a AND a.patient_id = _b)
       OR (a.doctor_id = _b AND a.patient_id = _a)
  ) OR EXISTS (
    SELECT 1 FROM public.consultation_sessions s
    WHERE (s.doctor_id = _a AND s.patient_id = _b)
       OR (s.doctor_id = _b AND s.patient_id = _a)
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_approved_doctor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_care_relationship(uuid, uuid) TO authenticated;

-- 3. Profiles: care-relationship visibility + approved doctor visibility
DROP POLICY IF EXISTS p_care_relationship_sel ON public.profiles;
CREATE POLICY p_care_relationship_sel ON public.profiles
FOR SELECT TO authenticated
USING (public.shares_care_relationship(auth.uid(), user_id));

DROP POLICY IF EXISTS p_approved_doctor_sel ON public.profiles;
CREATE POLICY p_approved_doctor_sel ON public.profiles
FOR SELECT TO authenticated
USING (public.is_approved_doctor(user_id));

-- 4. Admin oversight of conversations
DROP POLICY IF EXISTS msg_admin_sel ON public.messages;
CREATE POLICY msg_admin_sel ON public.messages
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cm_admin_sel ON public.consultation_messages;
CREATE POLICY cm_admin_sel ON public.consultation_messages
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Keep profiles.role in sync when a doctor record is created/approved
CREATE OR REPLACE FUNCTION public.sync_doctor_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET role = 'doctor'
   WHERE user_id = NEW.user_id
     AND COALESCE(role, '') <> 'doctor';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_doctor_profile_role ON public.doctors;
CREATE TRIGGER trg_sync_doctor_profile_role
AFTER INSERT OR UPDATE OF verification_status ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.sync_doctor_profile_role();

-- 6. Backfill existing doctors whose profile role drifted
UPDATE public.profiles p
   SET role = 'doctor'
  FROM public.doctors d
 WHERE d.user_id = p.user_id
   AND COALESCE(p.role, '') <> 'doctor';
