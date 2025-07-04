-- Create storage bucket for doctor documents
INSERT INTO storage.buckets (id, name, public) VALUES ('doctor-documents', 'doctor-documents', false);

-- Create policies for doctor document uploads
CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'doctor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'doctor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all doctor documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'doctor-documents' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all doctor documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'doctor-documents' AND has_role(auth.uid(), 'admin'));