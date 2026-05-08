import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Droplets, BellRing, Check, X, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  buildHydrationSchedule, scheduleAlarm, cancelAlarm,
  requestNotificationPermission, showNotification, playAlarmChime,
} from "@/lib/wellnessAlarm";
import { registerWellnessAlarmSW, queueLocalAlarm, clearLocalAlarmsForKind, onWellnessAlarmAction } from "@/lib/wellnessAlarmSW";
import { useWellnessPersistence } from "@/hooks/useWellnessPersistence";

type Status = "taken" | "missed" | "pending";

export default function HydrationSchedule({ userId }: { userId?: string }) {
  const [liters, setLiters] = useState<number>(2);
  const [statuses, setStatuses] = useState<Record<number, Status>>({});
  const { upsertHydrationSlots, setHydrationStatus, loadHydrationToday } = useWellnessPersistence();

  const sched = useMemo(() => buildHydrationSchedule(liters), [liters]);

  // Initial load from DB
  useEffect(() => {
    requestNotificationPermission();
    registerWellnessAlarmSW();
    (async () => {
      const slots = await loadHydrationToday();
      if (slots.length > 0) {
        const map: Record<number, Status> = {};
        slots.forEach((s: any) => { map[s.slot_index] = s.status; });
        setStatuses(map);
        // Infer goal from existing slots
        const totalMl = slots.reduce((acc: number, s: any) => acc + (s.ml || 250), 0);
        setLiters(Math.round((totalMl / 1000) * 2) / 2);
      }
    })();
  }, [userId, loadHydrationToday]);

  // Persist schedule + register alarms (in-tab + SW background)
  useEffect(() => {
    upsertHydrationSlots(
      sched.slots.map(s => ({ index: s.index, time: s.time, ml: sched.mlPerGlass })),
      liters
    );
    sched.slots.forEach(s => cancelAlarm(`hydra:${s.index}`));
    clearLocalAlarmsForKind("water");
    sched.slots.forEach(s => {
      if (s.time.getTime() < Date.now()) return;
      scheduleAlarm(`hydra:${s.index}`, s.time, () => {
        playAlarmChime(8);
        showNotification("💧 Time to drink water", `Glass ${s.index} of ${sched.glasses} (${sched.mlPerGlass}ml)`);
        toast({ title: "💧 Hydration alarm", description: `Drink glass ${s.index} of ${sched.glasses}.` });
        scheduleAlarm(`hydra-miss:${s.index}`, new Date(Date.now() + 30 * 60 * 1000), async () => {
          if (!statuses[s.index]) {
            setStatuses(prev => ({ ...prev, [s.index]: "missed" }));
            await setHydrationStatus(s.index, "missed");
          }
        });
      });
      queueLocalAlarm({
        id: `hydra-${new Date().toISOString().slice(0,10)}-${s.index}`,
        fireAt: s.time.getTime(),
        title: "💧 Time to drink water",
        body: `Glass ${s.index} of ${sched.glasses} (${sched.mlPerGlass}ml)`,
        kind: "water", refId: String(s.index),
        url: "/health-challenges/hydration",
      });
    });
    return () => {
      sched.slots.forEach(s => { cancelAlarm(`hydra:${s.index}`); cancelAlarm(`hydra-miss:${s.index}`); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liters]);

  // Listen for SW notification action
  useEffect(() => {
    return onWellnessAlarmAction(async ({ action, kind, refId }) => {
      if (kind !== "water" || !refId) return;
      const idx = Number(refId);
      const status = action === "taken" ? "taken" : "missed";
      setStatuses(prev => ({ ...prev, [idx]: status }));
      await setHydrationStatus(idx, status);
    });
  }, [setHydrationStatus]);

  const mark = async (i: number, s: Status) => {
    setStatuses(prev => ({ ...prev, [i]: s }));
    await setHydrationStatus(i, s);
  };

  const taken = Object.values(statuses).filter(s => s === "taken").length;
  const missed = Object.values(statuses).filter(s => s === "missed").length;
  const pct = Math.round((taken / sched.glasses) * 100);
  const now = Date.now();
  const upcoming = sched.slots.filter(s => s.time.getTime() > now && !statuses[s.index]).slice(0, 3);

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><BellRing className="w-4 h-4 text-blue-500" /> 24-hour hydration timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Daily goal:</span>
          {[1, 1.5, 2, 2.5, 3].map(L => (
            <Button key={L} size="sm" variant={liters === L ? "default" : "outline"} onClick={() => setLiters(L)}>{L} L</Button>
          ))}
        </div>

        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-bold text-blue-600">
            {taken}<span className="text-sm font-normal text-muted-foreground"> / {sched.glasses} glasses · {sched.mlPerGlass}ml each</span>
          </p>
          <Badge variant={pct >= 80 ? "default" : "secondary"}>{pct}%</Badge>
        </div>
        <Progress value={pct} className="h-2" />

        {/* Visual timeline */}
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>08:00</span><span>14:00</span><span>20:00</span><span>22:00</span>
          </div>
          <div className="relative h-10 rounded-lg bg-blue-50 border border-blue-200 overflow-hidden">
            {sched.slots.map(s => {
              const startMin = 8 * 60, endMin = 22 * 60;
              const t = s.time.getHours() * 60 + s.time.getMinutes();
              const left = Math.max(0, Math.min(100, ((t - startMin) / (endMin - startMin)) * 100));
              const st = statuses[s.index] ?? "pending";
              const isPast = s.time.getTime() < now;
              const color = st === "taken" ? "bg-green-500" : st === "missed" ? "bg-red-500" : isPast ? "bg-orange-400" : "bg-blue-500";
              return (
                <div key={s.index} className={`absolute top-1 bottom-1 w-2 -ml-1 rounded ${color}`} style={{ left: `${left}%` }} title={`${s.label} · ${st}`} />
              );
            })}
            <div className="absolute top-0 bottom-0 w-px bg-amber-500"
              style={{ left: `${Math.max(0, Math.min(100, ((new Date().getHours() * 60 + new Date().getMinutes() - 480) / 840) * 100))}%` }} />
          </div>
          {upcoming.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Next: {upcoming.map(u => u.label).join(" · ")}
            </p>
          )}
          {missed > 0 && (
            <p className="text-xs text-red-600 mt-1">{missed} missed today</p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {sched.slots.map(s => {
            const st = statuses[s.index] ?? "pending";
            const isPast = s.time.getTime() < now;
            return (
              <div key={s.index} className={`rounded-lg border p-2 text-xs ${
                st === "taken" ? "border-green-300 bg-green-50/50" :
                st === "missed" ? "border-red-300 bg-red-50/50" :
                isPast ? "border-orange-300 bg-orange-50/30" : "border-blue-200"
              }`}>
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
        <p className="text-xs text-muted-foreground">Reminders run between 08:00 and 22:00 and persist across devices. Background alarms fire even when the tab is closed (allow notifications).</p>
      </CardContent>
    </Card>
  );
}
