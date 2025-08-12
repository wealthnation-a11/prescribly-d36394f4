-- Restrict call_logs access to only admins and the doctor involved
-- Ensure RLS is enabled
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing select policies to avoid duplicates or unintended access
DROP POLICY IF EXISTS "Patients can view their own call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can view their own call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Admins can view all call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Doctors can view their own call logs" ON public.call_logs;

-- Create strict SELECT policies
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

-- No INSERT/UPDATE/DELETE policies added or modified here (default deny)
