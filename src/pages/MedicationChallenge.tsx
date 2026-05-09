import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Pill, Plus, Trash2, BellRing, Check, X, Bell, History } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { usePageSEO } from "@/hooks/usePageSEO";
import {
  requestNotificationPermission, scheduleAlarm, cancelAlarm,
  showNotification, playAlarmChime,
  scheduleBackgroundNotification, cancelBackgroundNotification,
} from "@/lib/wellnessAlarm";

type Reminder = { id: string; drug_name: string; dosage: string | null; remind_at: string; is_active: boolean; frequency: string };
type Dose = { id: string; reminder_id: string | null; drug_name: string; dosage: string | null; scheduled_at: string; status: "pending" | "taken" | "missed"; dose_change: number; taken_at: string | null };

const todayAt = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(); d.setHours(h, m || 0, 0, 0); return d;
};

export default function MedicationChallenge() {
  usePageSEO({ title: "Medication Tracker - Prescribly", description: "Drug reminders, alarms and daily medication score.", canonicalPath: "/health-challenges/medication" });
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [drugName, setDrugName] = useState("");
  const [dosage, setDosage] = useState("");
  const [remindAt, setRemindAt] = useState("09:00");
  const [loading, setLoading] = useState(true);

  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const loadAll = async () => {
    if (!user) return;
    const [{ data: rems }, { data: ds }] = await Promise.all([
      supabase.from("drug_reminders").select("*").eq("user_id", user.id).eq("is_active", true).order("remind_at"),
      supabase.from("medication_doses").select("*").eq("user_id", user.id).gte("scheduled_at", today.toISOString()).lt("scheduled_at", tomorrow.toISOString()).order("scheduled_at"),
    ]);
    setReminders((rems ?? []) as Reminder[]);
    setDoses((ds ?? []) as Dose[]);
  };

  // Seed today's doses for each active reminder
  const ensureDoseRows = async (rems: Reminder[]) => {
    if (!user) return;
    const existingKeys = new Set(doses.map(d => d.reminder_id));
    const toInsert = rems
      .filter(r => !existingKeys.has(r.id))
      .map(r => ({
        user_id: user.id, reminder_id: r.id, drug_name: r.drug_name,
        dosage: r.dosage, scheduled_at: todayAt(r.remind_at.slice(0,5)).toISOString(),
        status: "pending" as const, dose_change: 0,
      }));
    if (toInsert.length) {
      await supabase.from("medication_doses").insert(toInsert);
      await loadAll();
    }
  };

  useEffect(() => { (async () => { await loadAll(); setLoading(false); requestNotificationPermission(); })(); }, [user?.id]);
  useEffect(() => { if (reminders.length) ensureDoseRows(reminders); }, [reminders.length]);

  // (Re)schedule alarms for each reminder (in-tab + SW background)
  useEffect(() => {
    reminders.forEach(r => {
      const fire = todayAt(r.remind_at.slice(0,5));
      if (fire.getTime() < Date.now()) return;
      const tag = `med:${user?.id}:${r.id}`;
      scheduleBackgroundNotification(tag, fire, `💊 Time to take ${r.drug_name}`, `${r.dosage ?? "Dose"} • ${r.remind_at.slice(0,5)}`);
      scheduleAlarm(`med:${r.id}`, fire, () => {
        playAlarmChime(10);
        showNotification(`💊 Time to take ${r.drug_name}`, `${r.dosage ?? "Dose"} • ${r.remind_at.slice(0,5)}`);
        toast({ title: `💊 Take ${r.drug_name}`, description: `${r.dosage ?? ""} — tap "Taken" once swallowed.` });
      });
    });
    return () => reminders.forEach(r => { cancelAlarm(`med:${r.id}`); cancelBackgroundNotification(`med:${user?.id}:${r.id}`); });
  }, [reminders.map(r => r.id + r.remind_at).join("|"), user?.id]);

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
    cancelAlarm(`med:${id}`); cancelBackgroundNotification(`med:${user?.id}:${id}`);
    setReminders(rs => rs.filter(r => r.id !== id));
  };

  const markDose = async (r: Reminder, status: "taken" | "missed") => {
    if (!user) return;
    const dose = doses.find(d => d.reminder_id === r.id);
    const taken_at = status === "taken" ? new Date().toISOString() : null;
    if (dose) {
      await supabase.from("medication_doses").update({ status, taken_at }).eq("id", dose.id);
    } else {
      await supabase.from("medication_doses").insert({
        user_id: user.id, reminder_id: r.id, drug_name: r.drug_name, dosage: r.dosage,
        scheduled_at: todayAt(r.remind_at.slice(0,5)).toISOString(), status, taken_at, dose_change: 0,
      });
    }
    await loadAll();
    toast({ title: status === "taken" ? "✅ Logged as taken" : "Marked missed" });
  };

  const adjustDose = async (r: Reminder, delta: number) => {
    if (!user) return;
    const dose = doses.find(d => d.reminder_id === r.id);
    if (dose) {
      await supabase.from("medication_doses").update({ dose_change: dose.dose_change + delta }).eq("id", dose.id);
    } else {
      await supabase.from("medication_doses").insert({
        user_id: user.id, reminder_id: r.id, drug_name: r.drug_name, dosage: r.dosage,
        scheduled_at: todayAt(r.remind_at.slice(0,5)).toISOString(), status: "pending", dose_change: delta,
      });
    }
    await loadAll();
  };

  const score = useMemo(() => {
    const total = reminders.length || 1;
    const taken = doses.filter(d => d.status === "taken").length;
    const missed = doses.filter(d => d.status === "missed").length;
    return { taken, missed, total, pct: Math.round((taken / total) * 100) };
  }, [doses, reminders]);

  return (
    <div className="min-h-screen medical-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon"><Link to="/health-challenges"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="p-3 rounded-full bg-pink-500/10 border border-pink-500/20"><Pill className="h-6 w-6 text-pink-500" /></div>
            <div>
              <h1 className="text-2xl font-bold">Medication Tracker</h1>
              <p className="text-muted-foreground text-sm">Reminders, alarms & daily adherence score</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/health-challenges/medication/history"><History className="h-4 w-4 mr-1" /> History</Link></Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BellRing className="w-4 h-4 text-pink-500" /> Today's adherence</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold">{score.taken}<span className="text-sm text-muted-foreground font-normal"> / {score.total} doses</span></p>
              <Badge variant={score.pct >= 80 ? "default" : "secondary"}>{score.pct}%</Badge>
            </div>
            <Progress value={score.pct} className="h-2" />
            <p className="text-xs text-muted-foreground">Taken: {score.taken} • Missed: {score.missed}. Synced to your account.</p>
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
              const dose = doses.find(d => d.reminder_id === r.id);
              return (
                <div key={r.id} className="border rounded-lg p-3 flex flex-wrap gap-3 items-center justify-between">
                  <div>
                    <p className="font-medium">{r.drug_name} <span className="text-xs text-muted-foreground">{r.dosage ?? ""}</span></p>
                    <p className="text-xs text-muted-foreground">⏰ {r.remind_at.slice(0,5)} • daily</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => adjustDose(r, -1)}>-</Button>
                    <span className="w-10 text-center text-sm">{dose?.dose_change ?? 0}</span>
                    <Button size="sm" variant="outline" onClick={() => adjustDose(r, 1)}>+</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={dose?.status === "taken" ? "default" : "outline"} onClick={() => markDose(r, "taken")}><Check className="w-4 h-4 mr-1" /> Taken</Button>
                    <Button size="sm" variant={dose?.status === "missed" ? "destructive" : "outline"} onClick={() => markDose(r, "missed")}><X className="w-4 h-4 mr-1" /> Miss</Button>
                    <Button size="icon" variant="ghost" onClick={() => removeReminder(r.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Alarms ring while the app is open. On Chrome/Android PWA, scheduled notifications also fire when the app is closed. All data syncs to your account.
        </p>
      </div>
    </div>
  );
}
