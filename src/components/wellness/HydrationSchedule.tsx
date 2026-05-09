import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Droplets, BellRing, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildHydrationSchedule, scheduleAlarm, cancelAlarm,
  requestNotificationPermission, showNotification, playAlarmChime,
  scheduleBackgroundNotification, cancelBackgroundNotification,
} from "@/lib/wellnessAlarm";

const GOAL_KEY = (uid: string | undefined) => `hydration_goal_${uid ?? "anon"}`;

type Status = "taken" | "missed" | "pending";
type Slot = { id?: string; slot_index: number; scheduled_at: string; ml: number; status: Status };

export default function HydrationSchedule() {
  const { user } = useAuth();
  const userId = user?.id;
  const [liters, setLiters] = useState<number>(() => Number(localStorage.getItem(GOAL_KEY(userId)) ?? 2));
  const [slots, setSlots] = useState<Slot[]>([]);

  const sched = useMemo(() => buildHydrationSchedule(liters), [liters]);
  const today = new Date().toISOString().slice(0, 10);

  // Load or seed today's slots from DB
  useEffect(() => {
    if (!userId) return;
    (async () => {
      requestNotificationPermission();
      const { data: existing } = await supabase
        .from("hydration_slots")
        .select("*")
        .eq("user_id", userId)
        .eq("log_date", today)
        .order("slot_index");

      if (existing && existing.length === sched.glasses) {
        setSlots(existing.map((r: any) => ({
          id: r.id, slot_index: r.slot_index, scheduled_at: r.scheduled_at, ml: r.ml, status: r.status,
        })));
      } else {
        // Replace with new schedule
        if (existing?.length) {
          await supabase.from("hydration_slots").delete().eq("user_id", userId).eq("log_date", today);
        }
        const rows = sched.slots.map(s => ({
          user_id: userId, log_date: today, slot_index: s.index,
          scheduled_at: s.time.toISOString(), ml: sched.mlPerGlass, status: "pending" as Status,
        }));
        const { data: ins } = await supabase.from("hydration_slots").insert(rows).select();
        setSlots((ins ?? []).map((r: any) => ({
          id: r.id, slot_index: r.slot_index, scheduled_at: r.scheduled_at, ml: r.ml, status: r.status,
        })));
      }
    })();
  }, [userId, liters]);

  // Schedule alarms (in-tab + background SW)
  useEffect(() => {
    localStorage.setItem(GOAL_KEY(userId), String(liters));
    sched.slots.forEach(s => cancelAlarm(`hydra:${s.index}`));
    sched.slots.forEach(s => cancelBackgroundNotification(`hydra:${userId}:${s.index}`));

    sched.slots.forEach(s => {
      if (s.time.getTime() < Date.now()) return;
      // SW background trigger (Chrome/Android PWA)
      scheduleBackgroundNotification(
        `hydra:${userId}:${s.index}`, s.time,
        "💧 Time to drink water", `Glass ${s.index} of ${sched.glasses} (${sched.mlPerGlass}ml)`
      );
      // In-tab alarm
      scheduleAlarm(`hydra:${s.index}`, s.time, () => {
        playAlarmChime(8);
        showNotification("💧 Time to drink water", `Glass ${s.index} of ${sched.glasses} (${sched.mlPerGlass}ml)`);
        toast({ title: "💧 Hydration alarm", description: `Drink glass ${s.index} of ${sched.glasses}.` });
      });
    });
    return () => {
      sched.slots.forEach(s => cancelAlarm(`hydra:${s.index}`));
    };
  }, [liters, sched, userId]);

  const mark = async (slot: Slot, status: "taken" | "missed") => {
    if (!userId) return;
    const taken_at = status === "taken" ? new Date().toISOString() : null;
    const next = slots.map(s => s.slot_index === slot.slot_index ? { ...s, status } : s);
    setSlots(next);
    if (slot.id) {
      await supabase.from("hydration_slots").update({ status, taken_at }).eq("id", slot.id);
    }
  };

  const taken = slots.filter(s => s.status === "taken").length;
  const missed = slots.filter(s => s.status === "missed").length;
  const pct = sched.glasses ? Math.round((taken / sched.glasses) * 100) : 0;

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><BellRing className="w-4 h-4 text-blue-500" /> Daily liter goal & alarms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Choose your daily goal:</span>
          {[1, 1.5, 2, 2.5, 3].map(L => (
            <Button key={L} size="sm" variant={liters === L ? "default" : "outline"} onClick={() => setLiters(L)}>
              {L} L
            </Button>
          ))}
        </div>

        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-bold text-blue-600">{taken}<span className="text-sm font-normal text-muted-foreground"> / {sched.glasses} glasses ({sched.mlPerGlass}ml each)</span></p>
          <Badge variant={pct >= 80 ? "default" : "secondary"}>{pct}%</Badge>
        </div>
        <Progress value={pct} className="h-2" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {slots.map(s => {
            const time = new Date(s.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={s.slot_index} className={`rounded-lg border p-2 text-xs ${s.status === "taken" ? "border-green-300 bg-green-50/50" : s.status === "missed" ? "border-red-300 bg-red-50/50" : "border-blue-200"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{time}</span>
                  <Droplets className="w-3 h-3 text-blue-500" />
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant={s.status === "taken" ? "default" : "outline"} className="h-7 px-2 flex-1" onClick={() => mark(s, "taken")}><Check className="w-3 h-3" /></Button>
                  <Button size="sm" variant={s.status === "missed" ? "destructive" : "outline"} className="h-7 px-2 flex-1" onClick={() => mark(s, "missed")}><X className="w-3 h-3" /></Button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Reminders persist across devices. Background alerts work on Chrome/Android PWA. Allow notifications for system alerts.</p>
      </CardContent>
    </Card>
  );
}
