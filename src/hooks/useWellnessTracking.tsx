import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type WellnessLog = {
  water_glasses: number;
  sleep_hours: number;
  steps: number;
  drugs_taken: number;
};

const empty: WellnessLog = { water_glasses: 0, sleep_hours: 0, steps: 0, drugs_taken: 0 };

export const useWellnessTracking = () => {
  const { user } = useAuth();
  const [log, setLog] = useState<WellnessLog>(empty);
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0, total_active_days: 0 });
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [{ data: l }, { data: s }] = await Promise.all([
      supabase.from("wellness_logs").select("water_glasses,sleep_hours,steps,drugs_taken").eq("user_id", user.id).eq("log_date", today).maybeSingle(),
      supabase.from("wellness_streaks").select("current_streak,longest_streak,total_active_days").eq("user_id", user.id).maybeSingle(),
    ]);
    if (l) setLog(l as WellnessLog); else setLog(empty);
    if (s) setStreak(s);
    setLoading(false);
  }, [user, today]);

  useEffect(() => { refresh(); }, [refresh]);

  const update = async (patch: Partial<WellnessLog>) => {
    if (!user) return;
    const next = { ...log, ...patch };
    setLog(next);
    const { error } = await supabase.from("wellness_logs").upsert({
      user_id: user.id, log_date: today, ...next,
    }, { onConflict: "user_id,log_date" });
    if (error) { toast({ title: "Save failed", variant: "destructive" }); return; }
    await updateStreak();
  };

  const updateStreak = async () => {
    if (!user) return;
    // Compute streak: consecutive days with any log
    const since = new Date(); since.setDate(since.getDate() - 200);
    const { data } = await supabase.from("wellness_logs")
      .select("log_date")
      .eq("user_id", user.id)
      .gte("log_date", since.toISOString().slice(0, 10))
      .order("log_date", { ascending: false });

    const dates = new Set((data ?? []).map((d: any) => d.log_date));
    let current = 0;
    const cursor = new Date();
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }
    const longest = Math.max(current, streak.longest_streak);
    const total = dates.size;

    await supabase.from("wellness_streaks").upsert({
      user_id: user.id, current_streak: current, longest_streak: longest,
      last_activity_date: today, total_active_days: total, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    setStreak({ current_streak: current, longest_streak: longest, total_active_days: total });

    // Award rewards
    await maybeAwardRewards(current);
  };

  const maybeAwardRewards = async (current: number) => {
    if (!user) return;
    const milestones = [
      { days: 7, key: "7_day_streak", title: "1 Week Warrior", type: "badge", credit: 0 },
      { days: 30, key: "30_day_streak", title: "Monthly Master", type: "badge", credit: 0 },
      { days: 90, key: "90_day_streak", title: "Quarterly Champion", type: "badge", credit: 0 },
      { days: 180, key: "6_month_streak", title: "6-Month Legend", type: "appointment_credit", credit: 15000 },
    ];
    for (const m of milestones) {
      if (current >= m.days) {
        const { error } = await supabase.from("wellness_rewards").upsert({
          user_id: user.id, reward_type: m.type, reward_key: m.key,
          title: m.title, credit_amount: m.credit,
          description: m.credit > 0 ? `Free appointment credit worth ₦${m.credit.toLocaleString()}` : `Awarded for ${m.days}-day streak`,
        }, { onConflict: "user_id,reward_key", ignoreDuplicates: true });
        if (!error && m.credit > 0) {
          toast({ title: `🎉 ${m.title}!`, description: `You unlocked a free ₦${m.credit.toLocaleString()} appointment credit.` });
        }
      }
    }
  };

  return { log, streak, loading, update, refresh };
};
