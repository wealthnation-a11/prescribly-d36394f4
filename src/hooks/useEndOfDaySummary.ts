import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { showNotification, scheduleBackgroundNotification, scheduleAlarm } from "@/lib/wellnessAlarm";

const EOD_HOUR = 22; // 10 PM local
const KEY = (uid: string, d: string) => `eod_done_${uid}_${d}`;

const todayKey = () => new Date().toISOString().slice(0, 10);

const fireSummary = async (userId: string, email?: string | null) => {
  const date = todayKey();
  const k = KEY(userId, date);
  if (localStorage.getItem(k)) return;

  try {
    const { data, error } = await (supabase.rpc as any)("compute_eod_summary", { _user_id: userId, _date: date });
    if (error) throw error;
    const s = Array.isArray(data) ? data[0] : data;
    const score = s?.total_score ?? 0;
    const earned = s?.points_earned ?? 0;
    const lost = s?.points_lost ?? 0;
    const body = `Score ${score} • +${earned} / -${lost}`;
    showNotification("📊 Your Daily Wellness Summary", body);
    toast({ title: "Daily wellness summary ready", description: body });
    if (email) {
      try {
        await supabase.functions.invoke("send-email-notification", {
          body: {
            to_email: email,
            subject: `Your Prescribly daily summary — Score ${score}`,
            message: `Hi! Here's your wellness recap for ${date}.\n\nTotal score: ${score}\nPoints earned: ${earned}\nPoints lost: ${lost}\nWater taken/missed: ${s?.water_taken ?? 0}/${s?.water_missed ?? 0}\nMeds taken/missed: ${s?.meds_taken ?? 0}/${s?.meds_missed ?? 0}\nMeditation minutes: ${s?.meditation_minutes ?? 0}\nSteps: ${s?.steps ?? 0}\nSleep: ${s?.sleep_hours ?? 0}h\n\nKeep it up!`,
            notification_type: "eod_summary",
          },
        });
      } catch (e) { console.warn("EOD email failed", e); }
    }
    localStorage.setItem(k, "1");
  } catch (e) { console.warn("compute_eod_summary failed", e); }
};

export const useEndOfDaySummary = () => {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const email = (user as any)?.email as string | undefined;
    const now = new Date();
    const fire = new Date();
    fire.setHours(EOD_HOUR, 0, 0, 0);
    if (now.getTime() >= fire.getTime()) {
      // Either fire immediately (once per day) if past 22:00 and not already done, then schedule for tomorrow
      fireSummary(user.id, email);
      fire.setDate(fire.getDate() + 1);
    }
    scheduleAlarm(`eod:${user.id}`, fire, () => fireSummary(user.id, email));
    scheduleBackgroundNotification(
      `eod:${user.id}`, fire,
      "📊 Daily Wellness Summary",
      "Tap to see today's score, points earned and lost."
    );
  }, [user]);
};
