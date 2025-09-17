-- Create call_sessions table
CREATE TABLE public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id),
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  channel_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('voice', 'video')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create chats table  
CREATE TABLE public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  message text,
  encrypted_message text,
  file_type text CHECK (file_type IN ('image', 'pdf', 'docx', 'audio')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for call_sessions
CREATE POLICY "Users can view their own call sessions" ON public.call_sessions
  FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = doctor_id);
  
CREATE POLICY "Users can create call sessions" ON public.call_sessions
  FOR INSERT WITH CHECK (auth.uid() = patient_id OR auth.uid() = doctor_id);
  
CREATE POLICY "Users can update their own call sessions" ON public.call_sessions
  FOR UPDATE USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- Create RLS policies for chats
CREATE POLICY "Users can view their own messages" ON public.chats
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
  
CREATE POLICY "Users can send messages" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
  
CREATE POLICY "Users can update their own messages" ON public.chats  
  FOR UPDATE USING (auth.uid() = sender_id);

-- Create indexes for better performance
CREATE INDEX idx_call_sessions_appointment ON public.call_sessions(appointment_id);
CREATE INDEX idx_call_sessions_patient ON public.call_sessions(patient_id);  
CREATE INDEX idx_call_sessions_doctor ON public.call_sessions(doctor_id);
CREATE INDEX idx_chats_sender ON public.chats(sender_id);
CREATE INDEX idx_chats_recipient ON public.chats(recipient_id);
CREATE INDEX idx_chats_created_at ON public.chats(created_at);