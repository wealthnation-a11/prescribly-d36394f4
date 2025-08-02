-- Update appointments table structure if needed
-- Add status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add status column to appointments if it doesn't exist
DO $$ BEGIN
    ALTER TABLE appointments ADD COLUMN status appointment_status DEFAULT 'pending';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Rename appointment_date to scheduled_time if needed
DO $$ BEGIN
    ALTER TABLE appointments RENAME COLUMN appointment_date TO scheduled_time;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

-- Create chats table for new messaging system
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  message text,
  file_url text,
  file_type text CHECK (file_type IN ('image', 'pdf', 'docx', 'audio')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Create policies for chats
CREATE POLICY "Users can view their own chats" 
ON public.chats 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create their own chats" 
ON public.chats 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can view their own chat files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-files' AND auth.uid()::text = split_part(name, '/', 1));

CREATE POLICY "Users can upload their own chat files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'chat-files' AND auth.uid()::text = split_part(name, '/', 1));

-- Update updated_at trigger for chats
CREATE TRIGGER update_chats_updated_at
BEFORE UPDATE ON public.chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();