import { supabase } from "@/integrations/supabase/client";

/**
 * Wellness points are computed server-side. The client only reports WHICH
 * activity happened and how many units — never how many points to add.
 */
export type WellnessActivity =
  | "water_slot"
  | "medication_taken"
  | "meditation_minute"
  | "sleep_logged"
  | "steps_1000"
  | "checkin";

export type WellnessChallenge = {
  id: string;
  challenge_type: string;
  challenge_name: string;
  status: string;
  progress: number;
  target: number;
};

export type WellnessProgress = {
  points: number;
  level: number;
  streak: number;
  challenges: WellnessChallenge[];
};

export const awardPoints = async (activity: WellnessActivity, qty = 1) => {
  if (qty <= 0) return;
  const { error } = await (supabase.rpc as any)("award_wellness_points", {
    _activity: activity,
    _qty: qty,
  });
  if (error) console.warn("award_wellness_points failed", error.message);
};

export const refreshChallenges = async (): Promise<WellnessChallenge[]> => {
  const { data, error } = await (supabase.rpc as any)("refresh_daily_challenges");
  if (error) {
    console.warn("refresh_daily_challenges failed", error.message);
    return [];
  }
  return (data ?? []) as WellnessChallenge[];
};

export const loadWellnessProgress = async (userId: string): Promise<WellnessProgress> => {
  const [challenges, points, streak] = await Promise.all([
    refreshChallenges(),
    supabase.from("user_points").select("points, level").eq("user_id", userId).maybeSingle(),
    supabase.from("wellness_streaks").select("current_streak").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    points: Number((points.data as any)?.points ?? 0),
    level: Number((points.data as any)?.level ?? 1),
    streak: Number((streak.data as any)?.current_streak ?? 0),
    challenges,
  };
};
