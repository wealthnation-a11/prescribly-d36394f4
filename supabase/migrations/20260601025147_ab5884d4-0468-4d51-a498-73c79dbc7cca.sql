
-- ============ Women's Health Module ============

-- 1. women_profiles
CREATE TABLE public.women_profiles (
  user_id uuid PRIMARY KEY,
  mode text NOT NULL DEFAULT 'cycle' CHECK (mode IN ('cycle','pregnancy')),
  height_cm numeric,
  weight_kg numeric,
  avg_cycle_length integer NOT NULL DEFAULT 28,
  avg_period_length integer NOT NULL DEFAULT 5,
  last_period_start date,
  due_date date,
  lmp_date date,
  notifications_enabled boolean NOT NULL DEFAULT true,
  language text DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.women_profiles TO authenticated;
GRANT ALL ON public.women_profiles TO service_role;
ALTER TABLE public.women_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY wp_own ON public.women_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY wp_adm ON public.women_profiles FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

-- 2. cycle_records
CREATE TABLE public.cycle_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cycle_start_date date NOT NULL,
  cycle_end_date date,
  period_length integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cycle_start_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cycle_records TO authenticated;
GRANT ALL ON public.cycle_records TO service_role;
ALTER TABLE public.cycle_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY cr_own ON public.cycle_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. period_logs
CREATE TABLE public.period_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  flow text CHECK (flow IN ('spotting','light','medium','heavy')),
  pain_level integer CHECK (pain_level BETWEEN 0 AND 10),
  mood text,
  symptoms text[] DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.period_logs TO authenticated;
GRANT ALL ON public.period_logs TO service_role;
ALTER TABLE public.period_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY pl_own ON public.period_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. symptom_logs
CREATE TABLE public.symptom_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  symptom text NOT NULL,
  severity integer CHECK (severity BETWEEN 0 AND 10),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.symptom_logs TO authenticated;
GRANT ALL ON public.symptom_logs TO service_role;
ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY sl_own ON public.symptom_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. fertility_predictions
CREATE TABLE public.fertility_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cycle_start_date date NOT NULL,
  ovulation_date date,
  fertile_window_start date,
  fertile_window_end date,
  conception_probability jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cycle_start_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fertility_predictions TO authenticated;
GRANT ALL ON public.fertility_predictions TO service_role;
ALTER TABLE public.fertility_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY fp_own ON public.fertility_predictions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. pregnancy_profiles
CREATE TABLE public.pregnancy_profiles (
  user_id uuid PRIMARY KEY,
  lmp_date date,
  due_date date,
  started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pregnancy_profiles TO authenticated;
GRANT ALL ON public.pregnancy_profiles TO service_role;
ALTER TABLE public.pregnancy_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY pp_own ON public.pregnancy_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. pregnancy_logs
CREATE TABLE public.pregnancy_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric,
  water_glasses integer,
  sleep_hours numeric,
  exercise_minutes integer,
  symptoms text[] DEFAULT '{}',
  mood text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pregnancy_logs TO authenticated;
GRANT ALL ON public.pregnancy_logs TO service_role;
ALTER TABLE public.pregnancy_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY plog_own ON public.pregnancy_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. baby_growth_data (reference table, readable by all authenticated)
CREATE TABLE public.baby_growth_data (
  week integer PRIMARY KEY CHECK (week BETWEEN 1 AND 42),
  size_comparison text NOT NULL,
  size_emoji text,
  length_cm numeric,
  weight_g numeric,
  milestones text[] DEFAULT '{}',
  development text
);
GRANT SELECT ON public.baby_growth_data TO authenticated;
GRANT ALL ON public.baby_growth_data TO service_role;
ALTER TABLE public.baby_growth_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY bgd_read ON public.baby_growth_data FOR SELECT TO authenticated USING (true);

-- 9. daily_health_logs
CREATE TABLE public.daily_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  mood text,
  energy text,
  sleep_hours numeric,
  weight_kg numeric,
  water_glasses integer,
  exercise_minutes integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_health_logs TO authenticated;
GRANT ALL ON public.daily_health_logs TO service_role;
ALTER TABLE public.daily_health_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY dhl_own ON public.daily_health_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. insights_reports
CREATE TABLE public.insights_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  report_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insights_reports TO authenticated;
GRANT ALL ON public.insights_reports TO service_role;
ALTER TABLE public.insights_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY ir_own ON public.insights_reports FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- timestamp triggers
CREATE TRIGGER trg_wp_upd BEFORE UPDATE ON public.women_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pp_upd BEFORE UPDATE ON public.pregnancy_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_dhl_upd BEFORE UPDATE ON public.daily_health_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed baby_growth_data weeks 1-40
INSERT INTO public.baby_growth_data (week, size_comparison, size_emoji, length_cm, weight_g, milestones, development) VALUES
(1,'Poppy seed','🌱',0.1,0.1,ARRAY['Fertilization may occur','Cell division begins'],'Pregnancy week count starts from last menstrual period.'),
(2,'Poppy seed','🌱',0.2,0.1,ARRAY['Ovulation week','Body prepares for implantation'],'Body is preparing for conception.'),
(3,'Sesame seed','🌰',0.2,0.2,ARRAY['Fertilization','Cells multiply rapidly'],'Tiny ball of cells implants in the uterus.'),
(4,'Poppy seed','🌱',0.4,0.4,ARRAY['Implantation completes','Pregnancy hormone rises'],'Embryo embeds in the uterine lining.'),
(5,'Apple seed','🍎',0.5,0.5,ARRAY['Heart begins to form','Neural tube develops'],'Major organs and systems begin to take shape.'),
(6,'Sweet pea','🫛',0.6,0.6,ARRAY['Heartbeat detectable','Limb buds appear'],'Baby''s heart starts beating.'),
(7,'Blueberry','🫐',1.0,1.0,ARRAY['Brain forms hemispheres','Tiny features emerge'],'Brain growth accelerates.'),
(8,'Raspberry','🫐',1.6,1.0,ARRAY['Fingers and toes forming','Eyelids develop'],'Baby looks more human-like.'),
(9,'Cherry','🍒',2.3,2.0,ARRAY['Tail disappears','Heart has four chambers'],'Baby is now officially a fetus.'),
(10,'Strawberry','🍓',3.1,4.0,ARRAY['Vital organs functional','Nails form'],'All major organs are in place.'),
(11,'Lime','🍋',4.1,7.0,ARRAY['Bones begin to harden','Hair follicles form'],'Baby can hiccup.'),
(12,'Plum','🟣',5.4,14.0,ARRAY['Reflexes develop','Vocal cords form'],'End of first trimester.'),
(13,'Peach','🍑',7.4,23.0,ARRAY['Fingerprints form','Body grows faster than head'],'Second trimester begins.'),
(14,'Lemon','🍋',8.7,43.0,ARRAY['Facial expressions possible','Liver makes bile'],'Baby can squint and frown.'),
(15,'Apple','🍎',10.1,70.0,ARRAY['Bones get harder','Hearing develops'],'Baby may sense light.'),
(16,'Avocado','🥑',11.6,100.0,ARRAY['Eyes can move','Backbone strengthens'],'Baby moves more actively.'),
(17,'Pear','🍐',13.0,140.0,ARRAY['Fat begins to form','Stronger heartbeat'],'Sense of balance develops.'),
(18,'Bell pepper','🫑',14.2,190.0,ARRAY['Ears positioned','Yawning begins'],'Baby is more active.'),
(19,'Mango','🥭',15.3,240.0,ARRAY['Vernix coats skin','Senses sharpen'],'Vernix protects baby''s skin.'),
(20,'Banana','🍌',16.4,300.0,ARRAY['Halfway point','Hair growing'],'You may feel kicks.'),
(21,'Carrot','🥕',26.7,360.0,ARRAY['Eyebrows visible','Swallows amniotic fluid'],'Digestive system practices.'),
(22,'Spaghetti squash','🟡',27.8,430.0,ARRAY['Sleep cycles','Lips and eyelids defined'],'Baby looks like a miniature newborn.'),
(23,'Large mango','🥭',28.9,501.0,ARRAY['Skin still wrinkled','Hearing well-developed'],'Loud sounds startle baby.'),
(24,'Corn','🌽',30.0,600.0,ARRAY['Hearing develops','Lungs maturing','Facial features clear'],'Hearing develops, lungs continue maturing and baby can respond to sounds.'),
(25,'Cauliflower','🥬',34.6,660.0,ARRAY['Hand coordination','Hair color forms'],'Baby responds to your voice.'),
(26,'Lettuce','🥬',35.6,760.0,ARRAY['Eyes open','Brain very active'],'Brain is developing fast.'),
(27,'Cabbage','🥬',36.6,875.0,ARRAY['Third trimester begins','Rapid brain growth'],'Baby practices breathing motions.'),
(28,'Eggplant','🍆',37.6,1005.0,ARRAY['REM sleep observed','Eyelashes grown'],'Baby may dream.'),
(29,'Butternut squash','🟠',38.6,1153.0,ARRAY['Muscles growing','Stronger kicks'],'Baby gains weight quickly.'),
(30,'Cucumber','🥒',39.9,1319.0,ARRAY['Brain develops folds','Better vision'],'Less space, slower movements.'),
(31,'Coconut','🥥',41.1,1502.0,ARRAY['Bone marrow makes red cells','All five senses active'],'Baby is filling out.'),
(32,'Jicama','🟤',42.4,1702.0,ARRAY['Toenails formed','Practice breathing'],'Baby positions head down.'),
(33,'Pineapple','🍍',43.7,1918.0,ARRAY['Bones hardening','Immune system grows'],'Detecting day and night.'),
(34,'Cantaloupe','🍈',45.0,2146.0,ARRAY['Lungs nearly mature','Central nervous system maturing'],'Baby is almost ready.'),
(35,'Honeydew','🍈',46.2,2383.0,ARRAY['Kidneys fully developed','Liver processes waste'],'Rapid weight gain.'),
(36,'Romaine lettuce','🥬',47.4,2622.0,ARRAY['Considered early term soon','Settles head-down'],'Less amniotic fluid.'),
(37,'Swiss chard','🥬',48.6,2859.0,ARRAY['Practicing breathing','Grasp reflex'],'Baby is full term soon.'),
(38,'Leek','🥬',49.8,3083.0,ARRAY['Toenails reach tips','Firm grasp'],'Vernix mostly shed.'),
(39,'Watermelon','🍉',50.7,3288.0,ARRAY['Full-term','Lungs maturing further'],'Ready to meet you.'),
(40,'Pumpkin','🎃',51.2,3462.0,ARRAY['Due date arrives','Ready for birth'],'Welcome to delivery week!');
