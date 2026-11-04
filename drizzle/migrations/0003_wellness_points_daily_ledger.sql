-- Daily ledger of awarded wellness points so points cannot be farmed by repeating RPC calls.
CREATE TABLE public.wellness_points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity text NOT NULL,
  points integer NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.wellness_points_ledger TO service_role;
ALTER TABLE public.wellness_points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY ledger_select_own ON public.wellness_points_ledger
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.award_wellness_points(_activity text, _qty integer DEFAULT 1)
 RETURNS TABLE(points integer, level integer, current_streak integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _unit int := 0;
  _cap int := 100;
  _add int := 0;
  _today_awarded int := 0;
  _pts int; _lvl int; _streak int; _last date; _longest int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  _qty := GREATEST(0, LEAST(COALESCE(_qty,1), 1000));

  -- The server decides the value of each activity; the client cannot pass points.
  CASE _activity
    WHEN 'water_slot'        THEN _unit := 2;  _cap := 30;
    WHEN 'medication_taken'  THEN _unit := 5;  _cap := 50;
    WHEN 'meditation_minute' THEN _unit := 1;  _cap := 30;
    WHEN 'sleep_logged'      THEN _unit := 10; _cap := 10;
    WHEN 'steps_1000'        THEN _unit := 2;  _cap := 30;
    WHEN 'checkin'           THEN _unit := 5;  _cap := 25;
    ELSE RAISE EXCEPTION 'unknown activity';
  END CASE;

  -- Enforce the daily cap from the ledger: repeat claims within the same day earn nothing extra.
  SELECT COALESCE(SUM(points),0) INTO _today_awarded
    FROM public.wellness_points_ledger
   WHERE user_id = _uid AND activity = _activity
     AND awarded_at >= date_trunc('day', now());
  _add := LEAST(_unit * _qty, GREATEST(_cap - _today_awarded, 0));

  -- Streak is maintained even when the daily cap is already reached.
  SELECT s.last_activity_date, s.current_streak, s.longest_streak
    INTO _last, _streak, _longest
    FROM public.wellness_streaks s WHERE s.user_id = _uid;

  IF _add > 0 THEN
    INSERT INTO public.wellness_points_ledger (user_id, activity, points)
    VALUES (_uid, _activity, _add);

    INSERT INTO public.user_points (user_id, points, level, updated_at)
    VALUES (_uid, _add, 1 + (_add / 100), now())
    ON CONFLICT (user_id) DO UPDATE
      SET points = public.user_points.points + _add,
          level = 1 + ((public.user_points.points + _add) / 100),
          updated_at = now()
    RETURNING public.user_points.points, public.user_points.level INTO _pts, _lvl;
  ELSE
    SELECT p.points, p.level INTO _pts, _lvl FROM public.user_points p WHERE p.user_id = _uid;
    _pts := COALESCE(_pts, 0);
    _lvl := COALESCE(_lvl, 1);
  END IF;

  IF _last IS NULL THEN
    INSERT INTO public.wellness_streaks (user_id, current_streak, longest_streak, last_activity_date, total_active_days, updated_at)
    VALUES (_uid, 1, 1, CURRENT_DATE, 1, now())
    ON CONFLICT (user_id) DO UPDATE SET current_streak = 1, longest_streak = GREATEST(public.wellness_streaks.longest_streak,1),
      last_activity_date = CURRENT_DATE, total_active_days = public.wellness_streaks.total_active_days + 1, updated_at = now();
    _streak := 1;
  ELSIF _last < CURRENT_DATE THEN
    _streak := CASE WHEN _last = CURRENT_DATE - 1 THEN COALESCE(_streak,0) + 1 ELSE 1 END;
    UPDATE public.wellness_streaks
       SET current_streak = _streak,
           longest_streak = GREATEST(COALESCE(_longest,0), _streak),
           last_activity_date = CURRENT_DATE,
           total_active_days = COALESCE(total_active_days,0) + 1,
           updated_at = now()
     WHERE user_id = _uid;
  END IF;

  RETURN QUERY SELECT _pts, _lvl, COALESCE(_streak,1);
END; $function$
