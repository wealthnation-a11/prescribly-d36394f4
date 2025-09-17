-- Update messages table to match the new specification
ALTER TABLE public.messages DROP COLUMN IF EXISTS receiver_id;
ALTER TABLE public.messages RENAME COLUMN message TO content;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_appointment_sender ON public.messages(appointment_id, sender_id);