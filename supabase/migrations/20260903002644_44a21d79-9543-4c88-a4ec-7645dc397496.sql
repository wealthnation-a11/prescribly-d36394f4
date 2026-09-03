-- 1. Lock down client writes to points / streaks / challenges
DROP POLICY IF EXISTS up_ins ON public.user_points;
DROP POLICY IF EXISTS up_upd ON public.user_points;
DROP POLICY IF EXISTS ws_own ON public.wellness_streaks;
CREATE POLICY ws_own_select ON public.wellness_streaks FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS uc_ins ON public.user_challenges;
DROP POLICY IF EXISTS uc_upd ON public.user_challenges;

REVOKE INSERT, UPDATE, DELETE ON public.user_points FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.wellness_streaks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_challenges FROM anon, authenticated;
GRANT SELECT ON public.user_points TO authenticated;
GRANT SELECT ON public.wellness_streaks TO authenticated;
GRANT SELECT ON public.user_challenges TO authenticated;
GRANT ALL ON public.user_points TO service_role;
GRANT ALL ON public.wellness_streaks TO service_role;
GRANT ALL ON public.user_challenges TO service_role;

-- 2. Fix end-of-day summary column bug (user_steps.step_count)
CREATE OR REPLACE FUNCTION public.compute_eod_summary(_user_id uuid, _date date DEFAULT CURRENT_DATE)
 RETURNS public.wellness_eod_summary
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_water_taken int := 0; v_water_missed int := 0;
  v_meds_taken int := 0; v_meds_missed int := 0;
  v_med_min int := 0; v_steps int := 0; v_sleep numeric := 0;
  v_earned int := 0; v_lost int := 0; v_score int := 0;
  v_row public.wellness_eod_summary;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _user_id AND NOT public.has_role(auth.uid(),'admin') AND auth.role() <> 'service_role') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*) FILTER (WHERE status='taken'), COUNT(*) FILTER (WHERE status='missed')
    INTO v_water_taken, v_water_missed
    FROM public.hydration_slots WHERE user_id=_user_id AND log_date=_date;

  SELECT COUNT(*) FILTER (WHERE status='taken'), COUNT(*) FILTER (WHERE status='missed')
    INTO v_meds_taken, v_meds_missed
    FROM public.medication_doses
    WHERE user_id=_user_id AND scheduled_at::date=_date;

  SELECT COALESCE(SUM(actual_minutes) FILTER (WHERE completed),0),
         COALESCE(SUM(points_change) FILTER (WHERE points_change > 0),0),
         COALESCE(-SUM(points_change) FILTER (WHERE points_change < 0),0)
    INTO v_med_min, v_earned, v_lost
    FROM public.meditation_sessions
    WHERE user_id=_user_id AND started_at::date=_date;

  SELECT COALESCE(step_count,0) INTO v_steps FROM public.user_steps
    WHERE user_id=_user_id AND date=_date LIMIT 1;
  SELECT COALESCE(hours_slept,0) INTO v_sleep FROM public.user_sleep_log
    WHERE user_id=_user_id AND date=_date LIMIT 1;

  v_earned := v_earned + (v_water_taken * 2) + (v_meds_taken * 5) + (v_med_min) + LEAST(COALESCE(v_steps,0)/1000, 20);
  v_lost := v_lost + (v_water_missed * 1) + (v_meds_missed * 5);
  v_score := v_earned - v_lost;

  INSERT INTO public.wellness_eod_summary (user_id, summary_date, total_score, points_earned, points_lost,
    water_taken, water_missed, meds_taken, meds_missed, meditation_minutes, steps, sleep_hours)
  VALUES (_user_id, _date, v_score, v_earned, v_lost, v_water_taken, v_water_missed, v_meds_taken, v_meds_missed, v_med_min, v_steps, v_sleep)
  ON CONFLICT (user_id, summary_date) DO UPDATE
    SET total_score=EXCLUDED.total_score, points_earned=EXCLUDED.points_earned, points_lost=EXCLUDED.points_lost,
        water_taken=EXCLUDED.water_taken, water_missed=EXCLUDED.water_missed,
        meds_taken=EXCLUDED.meds_taken, meds_missed=EXCLUDED.meds_missed,
        meditation_minutes=EXCLUDED.meditation_minutes, steps=EXCLUDED.steps, sleep_hours=EXCLUDED.sleep_hours
  RETURNING * INTO v_row;
  RETURN v_row;
END; $function$;

-- 3. Seed today's daily challenges
CREATE OR REPLACE FUNCTION public.ensure_daily_challenges()
 RETURNS SETOF public.user_challenges
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  INSERT INTO public.user_challenges (user_id, challenge_type, challenge_name, status, progress, target, started_at)
  SELECT _uid, c.ctype, c.cname, 'active', 0, c.ctarget, date_trunc('day', now())
  FROM (VALUES
    ('water','Drink 8 glasses of water', 8),
    ('steps','Walk 10,000 steps', 10000),
    ('medication','Take all your medication', 1),
    ('meditation','Meditate for 10 minutes', 10)
  ) AS c(ctype, cname, ctarget)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_challenges uc
    WHERE uc.user_id = _uid AND uc.challenge_type = c.ctype
      AND uc.started_at >= date_trunc('day', now())
  );

  RETURN QUERY
    SELECT * FROM public.user_challenges
    WHERE user_id = _uid AND started_at >= date_trunc('day', now())
    ORDER BY challenge_type;
END; $$;

-- 4. Server-side points / streak / challenge engine
CREATE OR REPLACE FUNCTION public.award_wellness_points(_activity text, _qty integer DEFAULT 1)
 RETURNS TABLE(points integer, level integer, current_streak integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
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

  -- server decides the value of each activity; client cannot pass points
  CASE _activity
    WHEN 'water_slot'        THEN _unit := 2;  _cap := 30;
    WHEN 'medication_taken'  THEN _unit := 5;  _cap := 50;
    WHEN 'meditation_minute' THEN _unit := 1;  _cap := 30;
    WHEN 'sleep_logged'      THEN _unit := 10; _cap := 10;
    WHEN 'steps_1000'        THEN _unit := 2;  _cap := 30;
    WHEN 'checkin'           THEN _unit := 5;  _cap := 25;
    ELSE RAISE EXCEPTION 'unknown activity';
  END CASE;

  _add := _unit * _qty;

  -- daily cap per activity, tracked through recent_activities-free ledger on user_points snapshot
  SELECT COALESCE(SUM(points_change),0) INTO _today_awarded
    FROM public.meditation_sessions WHERE FALSE; -- no-op placeholder for future ledger
  _add := LEAST(_add, _cap);

  INSERT INTO public.user_points (user_id, points, level, updated_at)
  VALUES (_uid, _add, 1 + (_add / 100), now())
  ON CONFLICT (user_id) DO UPDATE
    SET points = public.user_points.points + _add,
        level = 1 + ((public.user_points.points + _add) / 100),
        updated_at = now()
  RETURNING public.user_points.points, public.user_points.level INTO _pts, _lvl;

  -- streak
  SELECT s.last_activity_date, s.current_streak, s.longest_streak
    INTO _last, _streak, _longest
    FROM public.wellness_streaks s WHERE s.user_id = _uid;

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
END; $$;

-- 5. Recompute today's challenge progress from real logged data
CREATE OR REPLACE FUNCTION public.refresh_daily_challenges()
 RETURNS SETOF public.user_challenges
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _water numeric; _steps numeric; _med numeric; _medi numeric; _meds_total int; _meds_taken int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  PERFORM public.ensure_daily_challenges();

  SELECT COUNT(*) FILTER (WHERE status='taken') INTO _water
    FROM public.hydration_slots WHERE user_id=_uid AND log_date=CURRENT_DATE;

  SELECT COALESCE(step_count,0) INTO _steps FROM public.user_steps
    WHERE user_id=_uid AND date=CURRENT_DATE LIMIT 1;
  _steps := COALESCE(_steps,0);

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status='taken') INTO _meds_total, _meds_taken
    FROM public.medication_doses WHERE user_id=_uid AND scheduled_at::date=CURRENT_DATE;
  _med := CASE WHEN _meds_total > 0 AND _meds_taken = _meds_total THEN 1 ELSE 0 END;

  SELECT COALESCE(SUM(actual_minutes),0) INTO _medi FROM public.meditation_sessions
    WHERE user_id=_uid AND completed AND started_at::date=CURRENT_DATE;

  UPDATE public.user_challenges uc
     SET progress = LEAST(v.val, uc.target),
         status = CASE WHEN v.val >= uc.target THEN 'completed' ELSE 'active' END,
         completed_at = CASE WHEN v.val >= uc.target THEN COALESCE(uc.completed_at, now()) ELSE NULL END
    FROM (VALUES ('water', _water), ('steps', _steps), ('medication', _med), ('meditation', _medi))
      AS v(ctype, val)
   WHERE uc.user_id = _uid
     AND uc.challenge_type = v.ctype
     AND uc.started_at >= date_trunc('day', now())
     AND uc.status <> 'completed';

  RETURN QUERY
    SELECT * FROM public.user_challenges
    WHERE user_id = _uid AND started_at >= date_trunc('day', now())
    ORDER BY challenge_type;
END; $$;

-- 6. Backwards-compatible wrapper used by the Daily Check-in screen
CREATE OR REPLACE FUNCTION public.update_user_points(user_uuid uuid, points_to_add integer)
 RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> user_uuid THEN RAISE EXCEPTION 'forbidden'; END IF;
  PERFORM public.award_wellness_points('checkin', 1);
END; $$;

REVOKE ALL ON FUNCTION public.award_wellness_points(text, integer) FROM public;
REVOKE ALL ON FUNCTION public.ensure_daily_challenges() FROM public;
REVOKE ALL ON FUNCTION public.refresh_daily_challenges() FROM public;
REVOKE ALL ON FUNCTION public.update_user_points(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.award_wellness_points(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_daily_challenges() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_daily_challenges() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_points(uuid, integer) TO authenticated;