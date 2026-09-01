
REVOKE ALL ON FUNCTION public.is_approved_doctor(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_care_relationship(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_doctor_profile_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved_doctor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_care_relationship(uuid, uuid) TO authenticated;
