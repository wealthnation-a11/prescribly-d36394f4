import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Pill, Plus, Trash2, BellRing, Check, X, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { usePageSEO } from "@/hooks/usePageSEO";
import {
  requestNotificationPermission, scheduleAlarm, cancelAlarm,
  showNotification, playAlarmChime,
} from "@/lib/wellnessAlarm";
import { registerWellnessAlarmSW, queueLocalAlarm, clearLocalAlarmsForKind, onWellnessAlarmAction } from "@/lib/wellnessAlarmSW";
import { useWellnessPersistence } from "@/hooks/useWellnessPersistence";
import MedicationAdherenceHistory from "@/components/wellness/MedicationAdherenceHistory";

type Reminder = { id: string; drug_name: string; dosage: string | null; remind_at: string; is_active: boolean; frequency: string };
type DoseLog = Record<string, "taken" | "missed" | "pending">; // key = `${reminderId}:${HH:mm}` for today

const STORAGE_KEY = (uid: string) => `med_dose_log_${uid}_${new Date().toISOString().slice(0,10)}`;

const todayAt = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(); d.setHours(h, m || 0, 0, 0); return d;
};

export default function MedicationChallenge() {
  usePageSEO({ title: "Medication Tracker - Prescribly", description: "Drug reminders, alarms and daily medication score.", canonicalPath: "/health-challenges/medication" });
  const { user } = useAuth();
  const { recordMedicationDose } = useWellnessPersistence();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [log, setLog] = useState<DoseLog>({});
  const [drugName, setDrugName] = useState("");
  const [dosage, setDosage] = useState("");
  const [remindAt, setRemindAt] = useState("09:00");
  const [loading, setLoading] = useState(true);

  // Load reminders + today's log
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("drug_reminders").select("*").eq("user_id", user.id).eq("is_active", true).order("remind_at");
      setReminders((data ?? []) as Reminder[]);
      try { setLog(JSON.parse(localStorage.getItem(STORAGE_KEY(user.id)) ?? "{}")); } catch {}
      setLoading(false);
      requestNotificationPermission();
      registerWellnessAlarmSW();
    })();
  }, [user]);

  // SW notification action handler — auto-record taken/missed from the system notification
  useEffect(() => {
    return onWellnessAlarmAction(async ({ action, kind, refId }) => {
      if (kind !== "medication" || !refId) return;
      const r = reminders.find(x => x.id === refId);
      if (!r) return;
      const status = action === "taken" ? "taken" : "missed";
      const k = `${r.id}:${r.remind_at.slice(0,5)}`;
      persistLog({ ...log, [k]: status });
      await recordMedicationDose({
        reminder_id: r.id, drug_name: r.drug_name, dosage: r.dosage ?? undefined,
        scheduled_at: todayAt(r.remind_at.slice(0,5)), status,
      });
      toast({ title: status === "taken" ? "✅ Logged from notification" : "Marked missed" });
    });
  }, [reminders, log, recordMedicationDose]);

  // (Re)schedule alarms whenever reminders change — both in-tab + background
  useEffect(() => {
    clearLocalAlarmsForKind("medication");
    reminders.forEach(r => {
      const fire = todayAt(r.remind_at.slice(0,5));
      if (fire.getTime() < Date.now()) return;
      const key = `med:${r.id}`;
      scheduleAlarm(key, fire, () => {
        playAlarmChime(10);
        showNotification(`💊 Time to take ${r.drug_name}`, `${r.dosage ?? "Dose"} • ${r.remind_at.slice(0,5)}`);
        toast({ title: `💊 Take ${r.drug_name}`, description: `${r.dosage ?? ""} — tap "Taken" once swallowed.` });
      });
      // Also queue for background SW so it fires even if tab is closed
      queueLocalAlarm({
        id: `med-${r.id}-${fire.toISOString().slice(0,10)}`,
        fireAt: fire.getTime(),
        title: `💊 Time to take ${r.drug_name}`,
        body: `${r.dosage ?? "Dose"} • ${r.remind_at.slice(0,5)}`,
        kind: "medication", refId: r.id, url: "/health-challenges/medication",
      });
    });
    return () => reminders.forEach(r => cancelAlarm(`med:${r.id}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminders.map(r => r.id + r.remind_at).join("|")]);

  const persistLog = (next: DoseLog) => {
    setLog(next);
    if (user) localStorage.setItem(STORAGE_KEY(user.id), JSON.stringify(next));
  };

  const addReminder = async () => {
    if (!user || !drugName.trim()) return;
    const { data, error } = await supabase.from("drug_reminders").insert({
      user_id: user.id, drug_name: drugName.trim(), dosage: dosage.trim() || null,
      remind_at: remindAt + ":00", frequency: "daily", is_active: true,
    }).select().single();
    if (error) { toast({ title: "Could not save", variant: "destructive" }); return; }
    setReminders(rs => [...rs, data as Reminder]);
    setDrugName(""); setDosage("");
    toast({ title: "Reminder set", description: `${data.drug_name} at ${remindAt}` });
  };

  const removeReminder = async (id: string) => {
    await supabase.from("drug_reminders").update({ is_active: false }).eq("id", id);
    cancelAlarm(`med:${id}`);
    setReminders(rs => rs.filter(r => r.id !== id));
  };

  const mark = async (r: Reminder, status: "taken" | "missed") => {
    const key = `${r.id}:${r.remind_at.slice(0,5)}`;
    persistLog({ ...log, [key]: status });
    await recordMedicationDose({
      reminder_id: r.id, drug_name: r.drug_name, dosage: r.dosage ?? undefined,
      scheduled_at: todayAt(r.remind_at.slice(0,5)), status,
    });
    toast({ title: status === "taken" ? "✅ Logged as taken" : "Marked missed" });
  };

  const adjustDose = async (r: Reminder, delta: number) => {
    const k = `${r.id}:count`;
    const cur = Number(log[k] ?? 0);
    const next = Math.max(0, cur + delta);
    persistLog({ ...log, [k]: String(next) as any });
    await recordMedicationDose({
      reminder_id: r.id, drug_name: r.drug_name, dosage: r.dosage ?? undefined,
      scheduled_at: new Date(), status: "skipped", dose_change: delta,
      notes: `Manual dose adjust to ${next}`,
    });
  };

  const score = useMemo(() => {
    const total = reminders.length || 1;
    let taken = 0, missed = 0;
    reminders.forEach(r => {
      const k = `${r.id}:${r.remind_at.slice(0,5)}`;
      if (log[k] === "taken") taken++;
      else if (log[k] === "missed" || todayAt(r.remind_at.slice(0,5)).getTime() < Date.now() - 60*60*1000) {
        missed++;
      }
    });
    return { taken, missed, total, pct: Math.round((taken / total) * 100) };
  }, [log, reminders]);

  // Send daily summary notification on first load if any missed
  useEffect(() => {
    if (loading) return;
    const hour = new Date().getHours();
    if (hour >= 21 && score.missed > 0) {
      showNotification("Medication summary", `You took ${score.taken}/${score.total} doses today.`);
    }
  }, [loading, score.taken, score.missed, score.total]);

  return (
    <div className="min-h-screen medical-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon"><Link to="/health-challenges"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-pink-500/10 border border-pink-500/20"><Pill className="h-6 w-6 text-pink-500" /></div>
            <div>
              <h1 className="text-2xl font-bold">Medication Tracker</h1>
              <p className="text-muted-foreground text-sm">Reminders, alarms & daily adherence score</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BellRing className="w-4 h-4 text-pink-500" /> Today's adherence</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold">{score.taken}<span className="text-sm text-muted-foreground font-normal"> / {score.total} doses</span></p>
              <Badge variant={score.pct >= 80 ? "default" : "secondary"}>{score.pct}%</Badge>
            </div>
            <Progress value={score.pct} className="h-2" />
            <p className="text-xs text-muted-foreground">Taken: {score.taken} • Missed: {score.missed}. End-of-day notification will be sent.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" /> Add reminder</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2 space-y-1"><Label>Drug name</Label><Input value={drugName} onChange={e => setDrugName(e.target.value)} placeholder="Paracetamol" /></div>
            <div className="space-y-1"><Label>Dosage</Label><Input value={dosage} onChange={e => setDosage(e.target.value)} placeholder="500mg" /></div>
            <div className="space-y-1"><Label>Time</Label><Input type="time" value={remindAt} onChange={e => setRemindAt(e.target.value)} /></div>
            <Button onClick={addReminder} className="sm:col-span-4"><Bell className="w-4 h-4 mr-2" /> Schedule alarm</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Active reminders</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
             reminders.length === 0 ? <p className="text-sm text-muted-foreground">No reminders yet — add your first medication above.</p> :
             reminders.map(r => {
              const k = `${r.id}:${r.remind_at.slice(0,5)}`;
              const status = log[k];
              const count = Number(log[`${r.id}:count`] ?? 0);
              return (
                <div key={r.id} className="border rounded-lg p-3 flex flex-wrap gap-3 items-center justify-between">
                  <div>
                    <p className="font-medium">{r.drug_name} <span className="text-xs text-muted-foreground">{r.dosage ?? ""}</span></p>
                    <p className="text-xs text-muted-foreground">⏰ {r.remind_at.slice(0,5)} • daily</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => adjustDose(r, -1)}>-</Button>
                    <span className="w-10 text-center text-sm">{count}</span>
                    <Button size="sm" variant="outline" onClick={() => adjustDose(r, 1)}>+</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={status === "taken" ? "default" : "outline"} onClick={() => mark(r, "taken")}><Check className="w-4 h-4 mr-1" /> Taken</Button>
                    <Button size="sm" variant={status === "missed" ? "destructive" : "outline"} onClick={() => mark(r, "missed")}><X className="w-4 h-4 mr-1" /> Miss</Button>
                    <Button size="icon" variant="ghost" onClick={() => removeReminder(r.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <MedicationAdherenceHistory />

        <p className="text-xs text-muted-foreground text-center">
          Alarms ring while the app is open. Background alarms work via the wellness service worker — enable browser notifications when prompted.
        </p>
      </div>
    </div>
  );
}
