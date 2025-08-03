-- Create user_activities table
CREATE TABLE public.user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('appointment', 'chat', 'file_upload', 'payment')),
  activity_description text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Create index for efficient querying
CREATE INDEX idx_user_activities_user_created ON public.user_activities (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their activities"
ON public.user_activities
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their activities"
ON public.user_activities
FOR INSERT
WITH CHECK (auth.uid() = user_id);