import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const today = () => new Date().toISOString().slice(0, 10);

export const useWellnessPersistence = () => {
  const { user } = useAuth();

  // ---- Hydration slots ----
  const upsertHydrationSlots = useCallback(
    async (slots: { index: number; time: Date; ml: number }[], goalLiters: number) => {
      if (!user) return;
      // Persist goal
      await supabase.from("user_hydration_log").upsert(
        { user_id: user.id, date: today(), glasses_drank: 0, goal: slots.length, goal_liters: goalLiters },
        { onConflict: "user_id,date", ignoreDuplicates: false }
      );
      // Upsert each slot
      const rows = slots.map((s) => ({
        user_id: user.id,
        log_date: today(),
        slot_index: s.index,
        scheduled_at: s.time.toISOString(),
        ml: s.ml,
      }));
      // Insert ignore-existing
      await supabase.from("hydration_slots").upsert(rows, {
        onConflict: "user_id,log_date,slot_index",
        ignoreDuplicates: true,
      });
    },
    [user]
  );

  const setHydrationStatus = useCallback(
    async (slotIndex: number, status: "taken" | "missed" | "skipped" | "pending") => {
      if (!user) return;
      await supabase
        .from("hydration_slots")
        .update({ status, taken_at: status === "taken" ? new Date().toISOString() : null })
        .eq("user_id", user.id)
        .eq("log_date", today())
        .eq("slot_index", slotIndex);
    },
    [user]
  );

  const loadHydrationToday = useCallback(async () => {
    if (!user) return [];
    const { data } = await supabase
      .from("hydration_slots")
      .select("*")
      .eq("user_id", user.id)
      .eq("log_date", today())
      .order("slot_index", { ascending: true });
    return data ?? [];
  }, [user]);

  // ---- Medication doses ----
  const recordMedicationDose = useCallback(
    async (input: {
      reminder_id?: string | null;
      drug_name: string;
      dosage?: string;
      scheduled_at: Date;
      status: "taken" | "missed" | "skipped";
      dose_change?: number;
      notes?: string;
    }) => {
      if (!user) return;
      await supabase.from("medication_doses").insert({
        user_id: user.id,
        reminder_id: input.reminder_id ?? null,
        drug_name: input.drug_name,
        dosage: input.dosage ?? null,
        scheduled_at: input.scheduled_at.toISOString(),
        status: input.status,
        dose_change: input.dose_change ?? 0,
        notes: input.notes ?? null,
        taken_at: input.status === "taken" ? new Date().toISOString() : null,
      });
    },
    [user]
  );

  const loadMedicationHistory = useCallback(
    async (days = 14) => {
      if (!user) return [];
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data } = await supabase
        .from("medication_doses")
        .select("*")
        .eq("user_id", user.id)
        .gte("scheduled_at", since.toISOString())
        .order("scheduled_at", { ascending: false });
      return data ?? [];
    },
    [user]
  );

  // ---- Meditation sessions ----
  const startMeditation = useCallback(
    async (planned_minutes: number, sound_id?: string) => {
      if (!user) return null;
      const { data } = await supabase
        .from("meditation_sessions")
        .insert({ user_id: user.id, planned_minutes, sound_id: sound_id ?? null })
        .select()
        .single();
      return data;
    },
    [user]
  );

  const endMeditation = useCallback(
    async (sessionId: string, actual_minutes: number, completed: boolean) => {
      if (!user) return;
      const points_change = completed ? Math.max(5, actual_minutes) : -10;
      await supabase
        .from("meditation_sessions")
        .update({
          ended_at: new Date().toISOString(),
          actual_minutes,
          completed,
          points_change,
        })
        .eq("id", sessionId)
        .eq("user_id", user.id);
      return points_change;
    },
    [user]
  );

  // ---- Sleep / steps simple persistence ----
  const upsertSleep = useCallback(
    async (hours: number, quality?: string) => {
      if (!user) return;
      await supabase
        .from("user_sleep_log")
        .upsert(
          { user_id: user.id, date: today(), hours_slept: hours, quality: quality ?? null },
          { onConflict: "user_id,date" }
        );
    },
    [user]
  );

  const upsertSteps = useCallback(
    async (steps: number, goal = 5000) => {
      if (!user) return;
      await supabase
        .from("user_steps")
        .upsert(
          { user_id: user.id, date: today(), step_count: steps, goal, goal_reached: steps >= goal },
          { onConflict: "user_id,date" }
        );
    },
    [user]
  );

  // ---- EOD summary ----
  const computeEod = useCallback(
    async (date?: string) => {
      if (!user) return null;
      const { data, error } = await supabase.rpc("compute_eod_summary", {
        _user_id: user.id,
        _date: date ?? today(),
      });
      if (error) {
        console.warn("compute_eod_summary failed", error);
        return null;
      }
      return data;
    },
    [user]
  );

  // ---- Background alarm queue ----
  const queueAlarms = useCallback(
    async (alarms: { kind: "water" | "medication" | "sleep" | "meditation"; ref_id?: string; title: string; body: string; fire_at: Date }[]) => {
      if (!user || alarms.length === 0) return;
      const rows = alarms.map((a) => ({
        user_id: user.id,
        kind: a.kind,
        ref_id: a.ref_id ?? null,
        title: a.title,
        body: a.body,
        fire_at: a.fire_at.toISOString(),
      }));
      await supabase.from("wellness_alarm_queue").insert(rows);
    },
    [user]
  );

  return {
    upsertHydrationSlots,
    setHydrationStatus,
    loadHydrationToday,
    recordMedicationDose,
    loadMedicationHistory,
    startMeditation,
    endMeditation,
    upsertSleep,
    upsertSteps,
    computeEod,
    queueAlarms,
  };
};
