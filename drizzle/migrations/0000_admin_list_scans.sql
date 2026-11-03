CREATE OR REPLACE FUNCTION public.admin_list_scans()
RETURNS TABLE(id uuid, user_id uuid, patient_name text, patient_email text, file_name text, status text, amount numeric, paid_at timestamptz, payment_reference text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT s.id, s.user_id,
    trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), p.email,
    s.file_name, s.status, s.amount::numeric, s.paid_at, s.payment_reference, s.created_at
  FROM public.medical_result_scans s LEFT JOIN public.profiles p ON p.user_id = s.user_id
  ORDER BY s.created_at DESC LIMIT 500;
END $$;
REVOKE ALL ON FUNCTION public.admin_list_scans() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_scans() TO authenticated, service_role;