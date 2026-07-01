import { useEffect, useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, isSameDay, startOfWeek } from "date-fns";
import { motion } from "framer-motion";
import { Sparkles, Plus, MessageCircleQuestion, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWomensProfile } from "@/hooks/useWomensProfile";
import { computeCycle } from "@/lib/cycleMath";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const MOODS = ["Happy", "Calm", "Sensitive", "Irritated", "Sad", "Anxious", "Stressed"];
const SYMPTOMS = ["Cramps", "Bloating", "Headache", "Backache", "Acne", "Fatigue", "Tender breasts", "Nausea"];
const CRAVINGS = ["Sweet", "Salty", "Chocolate", "Carbs", "Spicy"];

const PeriodTodayFlo = () => {
  const { user } = useAuth();
  const { profile } = useWomensProfile();
  const navigate = useNavigate();
  const cycle = useMemo(
    () => (profile?.last_period_start ? computeCycle(profile.last_period_start, profile.avg_cycle_length, profile.avg_period_length) : null),
    [profile],
  );
  const today = new Date();
  const [focusDay, setFocusDay] = useState<Date>(today);

  // Week strip
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isPredictedPeriod = (d: Date) => {
    if (!cycle) return false;
    // current or next period window
    const inCur = differenceInCalendarDays(d, cycle.cycleStart) >= 0 &&
      differenceInCalendarDays(d, cycle.cycleStart) < cycle.periodLength;
    const inNext = differenceInCalendarDays(d, cycle.nextPeriod) >= 0 &&
      differenceInCalendarDays(d, cycle.nextPeriod) < cycle.periodLength;
    return inCur || inNext;
  };

  // Daily entry (mood/symptoms/cravings)
  const dateKey = format(focusDay, "yyyy-MM-dd");
  const [entry, setEntry] = useState<{ mood?: string; mood_reason?: string; symptoms: string[]; cravings: string[]; notes?: string }>({ symptoms: [], cravings: [] });
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [moodWhy, setMoodWhy] = useState<{ open: boolean; text: string; loading: boolean }>({ open: false, text: "", loading: false });
  const [insight, setInsight] = useState<{ text: string; loading: boolean; error?: string }>({ text: "", loading: true });

  useEffect(() => {
    if (!user) return;
    setLoadingEntry(true);
    (supabase as any).from("women_daily_log").select("*").eq("user_id", user.id).eq("log_date", dateKey).maybeSingle()
      .then(({ data }: any) => {
        setEntry({
          mood: data?.mood ?? undefined,
          mood_reason: data?.mood_reason ?? undefined,
          symptoms: data?.symptoms ?? [],
          cravings: data?.cravings ?? [],
          notes: data?.notes ?? "",
        });
      })
      .finally(() => setLoadingEntry(false));
  }, [user, dateKey]);

  const saveEntry = async (patch: Partial<typeof entry>) => {
    if (!user) return;
    const next = { ...entry, ...patch };
    setEntry(next);
    await (supabase as any).from("women_daily_log").upsert({
      user_id: user.id, log_date: dateKey,
      mood: next.mood ?? null, mood_reason: next.mood_reason ?? null,
      symptoms: next.symptoms, cravings: next.cravings, notes: next.notes ?? null,
    }, { onConflict: "user_id,log_date" });
  };

  const toggle = (list: string[], v: string) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];

  const askMoodWhy = async (m: string) => {
    setMoodWhy({ open: true, text: "", loading: true });
    try {
      const { data, error } = await supabase.functions.invoke("gift-assistant", { body: { mode: "mood-reason", mood: m } });
      if (error) throw error;
      const txt = (data as any)?.text ?? "";
      setMoodWhy({ open: true, text: txt, loading: false });
      await saveEntry({ mood: m, mood_reason: txt });
    } catch (e: any) {
      setMoodWhy({ open: true, text: "Couldn't get a reason right now. Tap retry.", loading: false });
    }
  };

  const loadInsight = async () => {
    setInsight({ text: "", loading: true });
    try {
      const { data, error } = await supabase.functions.invoke("gift-assistant", { body: { mode: "insight" } });
      if (error) throw error;
      setInsight({ text: (data as any)?.text ?? "", loading: false });
    } catch (e: any) {
      setInsight({ text: "", loading: false, error: e?.message ?? "Failed" });
    }
  };
  useEffect(() => { loadInsight(); /* eslint-disable-next-line */ }, [profile?.last_period_start]);

  if (!cycle) return null;

  const status = cycle.status === "period"
    ? { headline: `Period: Day ${cycle.cycleDay}`, sub: "Take it easy today 💗" }
    : cycle.daysUntilNextPeriod <= 0
    ? { headline: "Period may start today", sub: "Log it when it begins" }
    : cycle.daysUntilNextPeriod <= 3
    ? { headline: `Period in ${cycle.daysUntilNextPeriod} day${cycle.daysUntilNextPeriod === 1 ? "" : "s"}`, sub: "Symptoms may appear" }
    : { headline: `Cycle Day ${cycle.cycleDay}`, sub: `Next period in ${cycle.daysUntilNextPeriod} days` };

  const delayed = cycle.daysUntilNextPeriod < -1;

  return (
    <div className="space-y-4">
      {/* Day strip */}
      <div className="rounded-2xl p-4" style={{ background: "var(--gradient-wh-hero)" }}>
        <div className="flex justify-center text-xs text-muted-foreground mb-1">
          {days.map((d) => (
            <div key={d.toISOString()} className="w-10 text-center">{format(d, "EEEEE")}</div>
          ))}
        </div>
        <div className="flex justify-center">
          {days.map((d) => {
            const isFocus = isSameDay(d, focusDay);
            const isTodayD = isSameDay(d, today);
            const isPer = isPredictedPeriod(d);
            return (
              <button key={d.toISOString()} onClick={() => setFocusDay(d)}
                className={`w-10 h-10 mx-0 rounded-full grid place-items-center text-sm font-semibold transition
                  ${isFocus ? "ring-2 ring-wh-pink-deep" : ""}
                  ${isTodayD && !isPer ? "bg-white text-foreground shadow" : ""}
                  ${isPer ? "bg-wh-pink text-white" : ""}
                  ${!isPer && !isTodayD ? "text-foreground" : ""}
                `}>
                {format(d, "d")}
              </button>
            );
          })}
        </div>
        <div className="mt-6 text-center">
          <p className="text-2xl font-extrabold text-wh-pink-deep">{status.headline}</p>
          <p className="text-sm text-muted-foreground mt-1">{status.sub}</p>
          <Button onClick={() => navigate("/womens-health/log-period")}
            className="mt-4 bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full px-8">
            {cycle.status === "period" ? "Edit period dates" : "Log period"}
          </Button>
        </div>
      </div>

      {/* Ovulation quick card */}
      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Ovulation</p>
          <p className="font-bold">{format(cycle.ovulationDate, "d MMM")}</p>
          <p className="text-xs text-muted-foreground">Fertile: {format(cycle.fertileStart, "d MMM")} – {format(cycle.fertileEnd, "d MMM")}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Next period</p>
          <p className="font-bold text-wh-pink">{format(cycle.nextPeriod, "d MMM")}</p>
          <p className="text-xs text-muted-foreground">Ends {format(addDays(cycle.nextPeriod, cycle.periodLength - 1), "d MMM")}</p>
        </div>
      </Card>

      {/* Daily insight */}
      <Card className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-wh-pink mt-0.5" />
          <p className="font-bold text-sm">Today's insight from Gift</p>
          <button onClick={loadInsight} className="ml-auto text-muted-foreground hover:text-foreground"><RefreshCw className="h-4 w-4" /></button>
        </div>
        {insight.loading ? (
          <div className="space-y-2"><div className="h-3 bg-muted rounded animate-pulse w-full" /><div className="h-3 bg-muted rounded animate-pulse w-3/4" /></div>
        ) : insight.error ? (
          <p className="text-sm text-muted-foreground">Couldn't load. <button onClick={loadInsight} className="text-wh-pink underline">Retry</button></p>
        ) : (
          <p className="text-sm leading-snug whitespace-pre-wrap">{insight.text}</p>
        )}
      </Card>

      {/* Mood */}
      <Card className="p-4">
        <p className="font-bold text-sm mb-2">How are you feeling?</p>
        <div className="flex flex-wrap gap-2">
          {MOODS.map(m => (
            <button key={m} onClick={() => askMoodWhy(m)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition
                ${entry.mood === m ? "bg-wh-pink text-white border-wh-pink" : "bg-background border-border hover:border-wh-pink"}`}>
              {m}
            </button>
          ))}
        </div>
        {entry.mood && !moodWhy.open && entry.mood_reason && (
          <button onClick={() => setMoodWhy({ open: true, text: entry.mood_reason!, loading: false })}
            className="mt-3 text-xs text-wh-pink font-semibold flex items-center gap-1">
            <MessageCircleQuestion className="h-3.5 w-3.5" /> Check the reason why
          </button>
        )}
        {moodWhy.open && (
          <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
            {moodWhy.loading ? <span className="text-muted-foreground">Gift is thinking…</span> : moodWhy.text}
          </div>
        )}
      </Card>

      {/* Symptoms */}
      <Card className="p-4">
        <p className="font-bold text-sm mb-2">Symptoms</p>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map(s => (
            <button key={s} onClick={() => saveEntry({ symptoms: toggle(entry.symptoms, s) })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition
                ${entry.symptoms.includes(s) ? "bg-wh-pink text-white border-wh-pink" : "bg-background border-border"}`}>
              {s}
            </button>
          ))}
        </div>
        <p className="font-bold text-sm mt-4 mb-2">Cravings</p>
        <div className="flex flex-wrap gap-2">
          {CRAVINGS.map(s => (
            <button key={s} onClick={() => saveEntry({ cravings: toggle(entry.cravings, s) })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition
                ${entry.cravings.includes(s) ? "bg-wh-pink text-white border-wh-pink" : "bg-background border-border"}`}>
              {s}
            </button>
          ))}
        </div>
      </Card>

      {/* Delay support */}
      {delayed && (
        <Card className="p-4 bg-wh-pink-soft border-0">
          <p className="font-bold text-sm mb-1">Your period is {Math.abs(cycle.daysUntilNextPeriod)} day{Math.abs(cycle.daysUntilNextPeriod) === 1 ? "" : "s"} late</p>
          <p className="text-xs text-muted-foreground mb-3">Chat with Gift to understand why and what to check.</p>
          <Button size="sm" onClick={() => navigate("/womens-health/secret-chats?topic=delay")} className="bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full">
            Chat with Gift
          </Button>
        </Card>
      )}
    </div>
  );
};

export default PeriodTodayFlo;
