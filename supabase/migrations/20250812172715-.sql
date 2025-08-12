-- Security hardening migration
-- 1) call_logs: ensure only admins and involved doctors can read
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Doctors can view their own call logs" ON public.call_logs;
CREATE POLICY "Admins can view all call logs"
ON public.call_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Doctors can view their own call logs"
ON public.call_logs
FOR SELECT
TO authenticated
USING (auth.uid() = doctor_id);

-- 2) exchange_rates: restrict to authenticated for SELECT and service role for writes
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Authenticated users can view exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Service role can insert exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Service role can update exchange rates" ON public.exchange_rates;

CREATE POLICY "Authenticated users can view exchange rates"
ON public.exchange_rates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can insert exchange rates"
ON public.exchange_rates
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update exchange rates"
ON public.exchange_rates
FOR UPDATE
TO service_role
USING (true);

-- 3) public_doctor_profiles: require authentication for viewing
ALTER TABLE public.public_doctor_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view public doctor profiles" ON public.public_doctor_profiles;
DROP POLICY IF EXISTS "Public can view public doctor profiles" ON public.public_doctor_profiles;

CREATE POLICY "Authenticated users can view public doctor profiles"
ON public.public_doctor_profiles
FOR SELECT
TO authenticated
USING (true);

-- 4) Storage policies for chat-files and doctor-documents buckets
-- NOTE: storage.objects already has RLS enabled by default
-- 4a) chat-files: participants can read via chat reference; owners (by folder) and admins can manage
DROP POLICY IF EXISTS "Chat files: participants can read" ON storage.objects;
DROP POLICY IF EXISTS "Chat files: owner write" ON storage.objects;
DROP POLICY IF EXISTS "Chat files: owner update" ON storage.objects;
DROP POLICY IF EXISTS "Chat files: owner delete" ON storage.objects;
DROP POLICY IF EXISTS "Chat files: admin manage" ON storage.objects;

CREATE POLICY "Chat files: participants can read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.file_url IS NOT NULL
      AND (c.file_url ILIKE '%' || storage.objects.name)
      AND (auth.uid() = c.sender_id OR auth.uid() = c.recipient_id)
  )
);

CREATE POLICY "Chat files: owner write"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Chat files: owner update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Chat files: owner delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Chat files: admin manage"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'chat-files' AND public.has_role(auth.uid(), 'admin'::user_role)
)
WITH CHECK (
  bucket_id = 'chat-files' AND public.has_role(auth.uid(), 'admin'::user_role)
);

-- 4b) doctor-documents: owner and admins can read/write/update/delete
DROP POLICY IF EXISTS "Doctor documents: owner read" ON storage.objects;
DROP POLICY IF EXISTS "Doctor documents: owner write" ON storage.objects;
DROP POLICY IF EXISTS "Doctor documents: owner update" ON storage.objects;
DROP POLICY IF EXISTS "Doctor documents: owner delete" ON storage.objects;
DROP POLICY IF EXISTS "Doctor documents: admin manage" ON storage.objects;

CREATE POLICY "Doctor documents: owner read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'doctor-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Doctor documents: owner write"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'doctor-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Doctor documents: owner update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'doctor-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Doctor documents: owner delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'doctor-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::user_role)
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Doctor documents: admin manage"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'doctor-documents' AND public.has_role(auth.uid(), 'admin'::user_role)
)
WITH CHECK (
  bucket_id = 'doctor-documents' AND public.has_role(auth.uid(), 'admin'::user_role)
);
