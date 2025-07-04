-- Create symptom_logs table for tracking user symptom submissions
CREATE TABLE public.symptom_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  main_symptom TEXT NOT NULL,
  additional_symptoms TEXT,
  duration TEXT,
  severity INTEGER CHECK (severity >= 1 AND severity <= 5),
  recent_events TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table for chat functionality
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'ai', 'doctor')),
  sender_id UUID,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for symptom_logs
CREATE POLICY "Users can view their own symptom logs" 
ON public.symptom_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own symptom logs" 
ON public.symptom_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own symptom logs" 
ON public.symptom_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all symptom logs" 
ON public.symptom_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create policies for messages
CREATE POLICY "Users can view their own messages" 
ON public.messages 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = sender_id);

CREATE POLICY "Users can create messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Doctors can view messages in their conversations" 
ON public.messages 
FOR SELECT 
USING (has_role(auth.uid(), 'doctor'::user_role) AND auth.uid() = sender_id);

CREATE POLICY "Admins can view all messages" 
ON public.messages 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_symptom_logs_updated_at
BEFORE UPDATE ON public.symptom_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();