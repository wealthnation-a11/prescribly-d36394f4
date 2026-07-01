
-- Daily wellness log for cycle mode: mood + symptoms per day, with AI-generated "why"
CREATE TABLE public.women_daily_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood TEXT,
  mood_reason TEXT,
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  cravings TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.women_daily_log TO authenticated;
GRANT ALL ON public.women_daily_log TO service_role;
ALTER TABLE public.women_daily_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wdl_own" ON public.women_daily_log FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_women_daily_log_updated_at BEFORE UPDATE ON public.women_daily_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Secret Chat: PIN-gated private AI conversations with Gift assistant
CREATE TABLE public.secret_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.secret_chat_sessions TO authenticated;
GRANT ALL ON public.secret_chat_sessions TO service_role;
ALTER TABLE public.secret_chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scs_own" ON public.secret_chat_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_secret_chat_sessions_updated_at BEFORE UPDATE ON public.secret_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.secret_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.secret_chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX ON public.secret_chat_messages (session_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.secret_chat_messages TO authenticated;
GRANT ALL ON public.secret_chat_messages TO service_role;
ALTER TABLE public.secret_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scm_own" ON public.secret_chat_messages FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PIN protection for secret chats. Hashed with pgcrypto crypt().
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE TABLE public.women_secret_pin (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.women_secret_pin TO authenticated;
GRANT ALL ON public.women_secret_pin TO service_role;
ALTER TABLE public.women_secret_pin ENABLE ROW LEVEL SECURITY;
-- Users can only tell whether a PIN exists / manage their own row; never expose the hash to the client
CREATE POLICY "wsp_own_manage" ON public.women_secret_pin FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_women_secret_pin_updated_at BEFORE UPDATE ON public.women_secret_pin
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Server-side helpers for PIN set/verify
CREATE OR REPLACE FUNCTION public.set_secret_pin(_pin TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _pin IS NULL OR length(_pin) < 4 OR length(_pin) > 12 THEN RAISE EXCEPTION 'invalid pin'; END IF;
  INSERT INTO public.women_secret_pin(user_id, pin_hash)
  VALUES (auth.uid(), public.crypt(_pin, public.gen_salt('bf', 10)))
  ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now();
  RETURN TRUE;
END; $$;

CREATE OR REPLACE FUNCTION public.verify_secret_pin(_pin TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  SELECT pin_hash INTO h FROM public.women_secret_pin WHERE user_id = auth.uid();
  IF h IS NULL THEN RETURN FALSE; END IF;
  RETURN h = public.crypt(_pin, h);
END; $$;

CREATE OR REPLACE FUNCTION public.has_secret_pin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.women_secret_pin WHERE user_id = auth.uid())
$$;

GRANT EXECUTE ON FUNCTION public.set_secret_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_secret_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_secret_pin() TO authenticated;

-- Admin broadcast popups
CREATE TABLE public.admin_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  cta_label TEXT,
  cta_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_broadcasts TO authenticated;
GRANT ALL ON public.admin_broadcasts TO service_role;
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ab_read_active" ON public.admin_broadcasts FOR SELECT TO authenticated
  USING (active = TRUE AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY "ab_admin_manage" ON public.admin_broadcasts FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER update_admin_broadcasts_updated_at BEFORE UPDATE ON public.admin_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.admin_broadcast_dismissals (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broadcast_id UUID NOT NULL REFERENCES public.admin_broadcasts(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, broadcast_id)
);
GRANT SELECT, INSERT, DELETE ON public.admin_broadcast_dismissals TO authenticated;
GRANT ALL ON public.admin_broadcast_dismissals TO service_role;
ALTER TABLE public.admin_broadcast_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "abd_own" ON public.admin_broadcast_dismissals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
