import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Droplets, BellRing, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  buildHydrationSchedule, scheduleAlarm, cancelAlarm,
  requestNotificationPermission, showNotification, playAlarmChime,
} from "@/lib/wellnessAlarm";

const KEY = (uid: string | undefined) => `hydration_${uid ?? "anon"}_${new Date().toISOString().slice(0,10)}`;
const GOAL_KEY = (uid: string | undefined) => `hydration_goal_${uid ?? "anon"}`;

type Status = "taken" | "missed" | "pending";

export default function HydrationSchedule({ userId }: { userId?: string }) {
  const [liters, setLiters] = useState<number>(() => Number(localStorage.getItem(GOAL_KEY(userId)) ?? 2));
  const [statuses, setStatuses] = useState<Record<number, Status>>({});

  const sched = useMemo(() => buildHydrationSchedule(liters), [liters]);

  useEffect(() => {
    try { setStatuses(JSON.parse(localStorage.getItem(KEY(userId)) ?? "{}")); } catch {}
    requestNotificationPermission();
  }, [userId]);

  useEffect(() => {
    localStorage.setItem(GOAL_KEY(userId), String(liters));
    // Cancel previous and schedule
    sched.slots.forEach(s => cancelAlarm(`hydra:${s.index}`));
    sched.slots.forEach(s => {
      if (s.time.getTime() < Date.now()) return;
      scheduleAlarm(`hydra:${s.index}`, s.time, () => {
        playAlarmChime(8);
        showNotification("💧 Time to drink water", `Glass ${s.index} of ${sched.glasses} (${sched.mlPerGlass}ml)`);
        toast({ title: "💧 Hydration alarm", description: `Drink glass ${s.index} of ${sched.glasses}.` });
        // auto-mark missed in 30 min if not handled
        scheduleAlarm(`hydra-miss:${s.index}`, new Date(Date.now() + 30*60*1000), () => {
          setStatuses(prev => {
            if (prev[s.index]) return prev;
            const next = { ...prev, [s.index]: "missed" as Status };
            localStorage.setItem(KEY(userId), JSON.stringify(next));
            return next;
          });
        });
      });
    });
    return () => {
      sched.slots.forEach(s => { cancelAlarm(`hydra:${s.index}`); cancelAlarm(`hydra-miss:${s.index}`); });
    };
  }, [liters, sched, userId]);

  const persist = (next: Record<number, Status>) => {
    setStatuses(next);
    localStorage.setItem(KEY(userId), JSON.stringify(next));
  };

  const mark = (i: number, s: Status) => persist({ ...statuses, [i]: s });

  const taken = Object.values(statuses).filter(s => s === "taken").length;
  const missed = Object.values(statuses).filter(s => s === "missed").length;
  const pct = Math.round((taken / sched.glasses) * 100);

  // End-of-day score notification
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 22 && (taken + missed) > 0) {
      showNotification("Hydration summary", `You drank ${taken}/${sched.glasses} glasses today. Great work!`);
    }
  }, [taken, missed, sched.glasses]);

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
          {sched.slots.map(s => {
            const st = statuses[s.index] ?? "pending";
            return (
              <div key={s.index} className={`rounded-lg border p-2 text-xs ${st === "taken" ? "border-green-300 bg-green-50/50" : st === "missed" ? "border-red-300 bg-red-50/50" : "border-blue-200"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{s.label}</span>
                  <Droplets className="w-3 h-3 text-blue-500" />
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant={st === "taken" ? "default" : "outline"} className="h-7 px-2 flex-1" onClick={() => mark(s.index, "taken")}><Check className="w-3 h-3" /></Button>
                  <Button size="sm" variant={st === "missed" ? "destructive" : "outline"} className="h-7 px-2 flex-1" onClick={() => mark(s.index, "missed")}><X className="w-3 h-3" /></Button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Reminders run between 08:00 and 22:00. Keep this tab open for in-app alarms; allow notifications for system alerts.</p>
      </CardContent>
    </Card>
  );
}
