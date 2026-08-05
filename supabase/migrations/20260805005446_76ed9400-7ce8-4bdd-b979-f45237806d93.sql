
CREATE POLICY "prf_storage_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'patient-records' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'patient-records' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "prf_storage_patient_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'patient-records'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "prf_storage_doctor_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'patient-records'
    AND EXISTS (
      SELECT 1 FROM public.consultation_sessions cs
      WHERE cs.doctor_id = auth.uid()
        AND cs.patient_id::text = (storage.foldername(storage.objects.name))[1]
    )
  );
