-- Add policy to allow users to create doctor profiles
CREATE POLICY "Users can create their doctor profile" 
ON public.doctors 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);