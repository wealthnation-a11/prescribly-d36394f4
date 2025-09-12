-- Create call_sessions table for tracking mock calls
CREATE TABLE public.call_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL,
  channel_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for call sessions
CREATE POLICY "Users can view their own call sessions"
ON public.call_sessions
FOR SELECT
USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE POLICY "Users can create call sessions for their appointments"
ON public.call_sessions
FOR INSERT
WITH CHECK (
  auth.uid() = patient_id AND 
  EXISTS (
    SELECT 1 FROM public.appointments 
    WHERE id = appointment_id 
    AND patient_id = auth.uid() 
    AND status = 'approved'
  )
);

CREATE POLICY "Users can update their own call sessions"
ON public.call_sessions
FOR UPDATE
USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_call_sessions_updated_at
BEFORE UPDATE ON public.call_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();