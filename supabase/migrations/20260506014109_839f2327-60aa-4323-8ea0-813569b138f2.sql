
-- Wellness logs (water/sleep/steps/drug)
CREATE TABLE public.wellness_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  water_glasses integer NOT NULL DEFAULT 0,
  sleep_hours numeric NOT NULL DEFAULT 0,
  steps integer NOT NULL DEFAULT 0,
  drugs_taken integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);
ALTER TABLE public.wellness_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY wl_own ON public.wellness_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Drug reminders
CREATE TABLE public.drug_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  drug_name text NOT NULL,
  dosage text,
  remind_at time NOT NULL,
  frequency text NOT NULL DEFAULT 'daily',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.drug_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY dr_own ON public.drug_reminders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Streaks
CREATE TABLE public.wellness_streaks (
  user_id uuid PRIMARY KEY,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  total_active_days integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wellness_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY ws_own ON public.wellness_streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Rewards (badges & appointment credits)
CREATE TABLE public.wellness_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_type text NOT NULL, -- 'badge' | 'appointment_credit'
  reward_key text NOT NULL,  -- e.g. '6_month_streak'
  title text NOT NULL,
  description text,
  credit_amount numeric DEFAULT 0,
  is_redeemed boolean NOT NULL DEFAULT false,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reward_key)
);
ALTER TABLE public.wellness_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY wr_own ON public.wellness_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY wr_own_upd ON public.wellness_rewards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY wr_adm ON public.wellness_rewards FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY wr_srv_ins ON public.wellness_rewards FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Daily questions pool
CREATE TABLE public.daily_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  category text,
  options jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY dq_read ON public.daily_questions FOR SELECT USING (is_active = true);
CREATE POLICY dq_adm ON public.daily_questions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Daily answers
CREATE TABLE public.daily_question_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL,
  answer text NOT NULL,
  answered_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id, answered_on)
);
ALTER TABLE public.daily_question_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY dqa_own ON public.daily_question_answers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY dqa_adm ON public.daily_question_answers FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- AI chatbot history
CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY acm_own ON public.ai_chat_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_wellness_logs_user_date ON public.wellness_logs(user_id, log_date DESC);
CREATE INDEX idx_ai_chat_user ON public.ai_chat_messages(user_id, created_at);
CREATE INDEX idx_dqa_user_date ON public.daily_question_answers(user_id, answered_on DESC);

CREATE TRIGGER trg_wellness_logs_updated BEFORE UPDATE ON public.wellness_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed daily questions
INSERT INTO public.daily_questions (question, category, options) VALUES
('How would you rate your energy level today?', 'energy', '["Very low","Low","Moderate","High","Very high"]'::jsonb),
('How many hours did you sleep last night?', 'sleep', '["<4","4-6","6-8","8+"]'::jsonb),
('How would you rate your stress level today?', 'mental', '["None","Mild","Moderate","High","Severe"]'::jsonb),
('Did you experience any pain today?', 'pain', '["None","Mild","Moderate","Severe"]'::jsonb),
('How many glasses of water have you had?', 'hydration', '["0-2","3-5","6-8","9+"]'::jsonb),
('How is your appetite today?', 'nutrition', '["Poor","Fair","Good","Great"]'::jsonb),
('Did you exercise or move actively today?', 'activity', '["Not at all","A little","Moderately","A lot"]'::jsonb),
('How is your mood right now?', 'mental', '["Sad","Anxious","Neutral","Happy","Excited"]'::jsonb),
('Did you take all your medications today?', 'medication', '["None","Some","All"]'::jsonb),
('Any new symptoms today?', 'symptoms', '["No","Mild","Moderate","Severe"]'::jsonb);
