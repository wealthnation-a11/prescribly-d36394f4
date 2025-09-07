-- Create recent_activities table
CREATE TABLE public.recent_activities (
  activity_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  doctor_id UUID NULL,
  type TEXT NOT NULL CHECK (type IN ('appointment', 'prescription', 'chat', 'profile_update', 'availability_update')),
  details TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  related_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recent_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for users to view their own activities
CREATE POLICY "Users can view their own activities" 
ON public.recent_activities 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policies for doctors to view their own activities
CREATE POLICY "Doctors can view their own activities" 
ON public.recent_activities 
FOR SELECT 
USING (auth.uid() = doctor_id);

-- Create policies for users to insert their own activities
CREATE POLICY "Users can insert their own activities" 
ON public.recent_activities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policies for doctors to insert their own activities
CREATE POLICY "Doctors can insert their own activities" 
ON public.recent_activities 
FOR INSERT 
WITH CHECK (auth.uid() = doctor_id);

-- Enable real-time for recent_activities table
ALTER TABLE public.recent_activities REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.recent_activities;