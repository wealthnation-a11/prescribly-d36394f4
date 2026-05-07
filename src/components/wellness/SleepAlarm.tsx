import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Bell, AlarmClock, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  scheduleAlarm, cancelAlarm,
  requestNotificationPermission, showNotification, playAlarmChime,
} from "@/lib/wellnessAlarm";

const ALARM_ID = "sleep-wake-alarm";

export default function SleepAlarm() {
  const [hours, setHours] = useState(8);
  const [minutes, setMinutes] = useState(0);
  const [active, setActive] = useState(false);
  const [fireAt, setFireAt] = useState<Date | null>(null);
  const [ringing, setRinging] = useState(false);
  const stopRef = (window as any).__sleepStop || { current: null };

  useEffect(() => {
    requestNotificationPermission();
    return () => cancelAlarm(ALARM_ID);
  }, []);

  const startAlarm = () => {
    const ms = (hours * 60 + minutes) * 60 * 1000;
    const at = new Date(Date.now() + ms);
    setFireAt(at); setActive(true); setRinging(false);
    scheduleAlarm(ALARM_ID, at, () => {
      setRinging(true);
      stopRef.current = playAlarmChime(60);
      (window as any).__sleepStop = stopRef;
      showNotification("⏰ Wake up!", "Your sleep timer has finished. Tap 'I'm awake' to stop the alarm.");
      toast({ title: "⏰ Wake up!", description: "Tap 'I'm awake' to stop the alarm." });
    });
    toast({ title: "Alarm set", description: `Wake-up at ${at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` });
  };

  const cancel = () => {
    cancelAlarm(ALARM_ID);
    if (stopRef.current) { stopRef.current(); stopRef.current = null; }
    setActive(false); setRinging(false); setFireAt(null);
  };

  const stopRing = () => {
    if (stopRef.current) { stopRef.current(); stopRef.current = null; }
    setRinging(false); setActive(false); setFireAt(null);
    toast({ title: "Good morning! ☀️", description: "Wake-up confirmed. Don't forget to log your sleep below." });
  };

  return (
    <Card className="glassmorphism-card border-0 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><AlarmClock className="w-5 h-5 text-indigo-500" /> Sleep Alarm</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Set how long you want to sleep. The alarm will ring when the time elapses.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Hours</Label><Input type="number" min={0} max={12} value={hours} onChange={e => setHours(Math.max(0, Math.min(12, Number(e.target.value))))} disabled={active} /></div>
          <div className="space-y-1"><Label>Minutes</Label><Input type="number" min={0} max={59} value={minutes} onChange={e => setMinutes(Math.max(0, Math.min(59, Number(e.target.value))))} disabled={active} /></div>
        </div>
        {fireAt && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            ⏰ Will ring at <b>{fireAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b>
          </div>
        )}
        <div className="flex gap-2">
          {!active && !ringing && <Button className="flex-1" onClick={startAlarm}><Bell className="w-4 h-4 mr-2" /> Start sleep alarm</Button>}
          {active && !ringing && <Button variant="outline" className="flex-1" onClick={cancel}>Cancel</Button>}
          {ringing && <Button className="flex-1" onClick={stopRing}><Check className="w-4 h-4 mr-2" /> I'm awake</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
