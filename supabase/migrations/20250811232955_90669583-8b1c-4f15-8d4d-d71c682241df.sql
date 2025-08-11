-- Chat read receipts to support unread counts
CREATE TABLE IF NOT EXISTS public.chat_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  other_user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_receipts_user_other_unique UNIQUE (user_id, other_user_id)
);

ALTER TABLE public.chat_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY IF NOT EXISTS "Users can view their chat receipts"
ON public.chat_receipts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their chat receipts"
ON public.chat_receipts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their chat receipts"
ON public.chat_receipts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER update_chat_receipts_updated_at
BEFORE UPDATE ON public.chat_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();