-- Drop existing policies that depend on receiver_id
DROP POLICY IF EXISTS "Users can view messages in their appointments" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their appointments" ON public.messages;

-- Update table structure
ALTER TABLE public.messages DROP COLUMN IF EXISTS receiver_id CASCADE;
ALTER TABLE public.messages RENAME COLUMN message TO content;

-- Recreate RLS policies for the new structure
CREATE POLICY "Users can view messages in their appointments" ON public.messages
  FOR SELECT USING (
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

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_messages_appointment_sender ON public.messages(appointment_id, sender_id);