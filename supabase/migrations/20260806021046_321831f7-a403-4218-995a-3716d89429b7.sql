ALTER TABLE public.user_sleep_log
  ADD COLUMN IF NOT EXISTS bedtime time,
  ADD COLUMN IF NOT EXISTS wake_time time,
  ADD COLUMN IF NOT EXISTS awakenings integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dream_type text,
  ADD COLUMN IF NOT EXISTS mood_on_wake text,
  ADD COLUMN IF NOT EXISTS restfulness integer,
  ADD COLUMN IF NOT EXISTS late_caffeine boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS screens_before_bed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.user_sleep_log
  DROP CONSTRAINT IF EXISTS user_sleep_log_dream_type_check;
ALTER TABLE public.user_sleep_log
  ADD CONSTRAINT user_sleep_log_dream_type_check
  CHECK (dream_type IS NULL OR dream_type IN ('none','good','bad','vivid'));

ALTER TABLE public.user_sleep_log
  DROP CONSTRAINT IF EXISTS user_sleep_log_restfulness_check;
ALTER TABLE public.user_sleep_log
  ADD CONSTRAINT user_sleep_log_restfulness_check
  CHECK (restfulness IS NULL OR (restfulness BETWEEN 1 AND 5));

CREATE UNIQUE INDEX IF NOT EXISTS user_sleep_log_user_date_key
  ON public.user_sleep_log (user_id, date);

DROP TRIGGER IF EXISTS trg_user_sleep_log_updated ON public.user_sleep_log;
CREATE TRIGGER trg_user_sleep_log_updated
  BEFORE UPDATE ON public.user_sleep_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();