-- Create new messages table with appointment-based structure
DROP TABLE IF EXISTS public.messages CASCADE;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL, 
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view messages in their appointments" ON public.messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id OR
    EXISTS (
      SELECT 1 FROM public.appointments 
      WHERE id = messages.appointment_id 
      AND (patient_id = auth.uid() OR doctor_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their appointments" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.appointments 
      WHERE id = messages.appointment_id 
      AND (patient_id = auth.uid() OR doctor_id = auth.uid())
      AND status = 'approved'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_messages_appointment_id ON public.messages(appointment_id);
CREATE INDEX idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;