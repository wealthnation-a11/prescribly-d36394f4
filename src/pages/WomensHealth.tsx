import { useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Droplet, Moon, Smile, Activity, Plus, Minus, Heart, Flower2, Baby,
  Calendar as CalIcon, ChevronLeft, ChevronRight, Sparkles, Check,
} from "lucide-react";
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWomensProfile } from "@/hooks/useWomensProfile";
import { usePregnancyProfile } from "@/hooks/usePregnancyProfile";
import { computeCycle, statusLabel, conceptionCurve } from "@/lib/cycleMath";
import { computePregnancy, trimesterLabel } from "@/lib/pregnancyMath";
import WHLayout from "@/components/womens-health/WHLayout";
import { useQuery } from "@tanstack/react-query";

// ────────────────────────────────────────────────────────────────────────────
// Reusable ring
const Ring = ({ pct, color, children, size = 200 }: { pct: number; color: string; children: React.ReactNode; size?: number }) => {
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="overflow-visible">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth={10} fill="none" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={10} strokeLinecap="round" fill="none"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (c * Math.min(100, Math.max(0, pct))) / 100 }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
      <foreignObject x={0} y={0} width={size} height={size}>
        <div className="w-full h-full flex flex-col items-center justify-center text-center">{children}</div>
      </foreignObject>
    </svg>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// HOME
const WHHome = () => {
  const { user, userProfile } = useAuth();
  const { profile, loading, save } = useWomensProfile();
  const { profile: preg } = usePregnancyProfile();
  const navigate = useNavigate();

  if (loading) return <WHLayout><div className="space-y-3"><Card className="h-48 animate-pulse" /><Card className="h-24 animate-pulse" /></div></WHLayout>;

  // Onboarding (no last period, no pregnancy)
  if (!profile?.last_period_start && profile?.mode !== "pregnancy") {
    return <WHOnboarding onSaved={() => navigate("/womens-health")} />;
  }

  if (profile?.mode === "pregnancy") return <PregnancyHome />;

  const cycle = computeCycle(profile!.last_period_start!, profile!.avg_cycle_length, profile!.avg_period_length);
  const first = (userProfile as any)?.first_name || "there";

  return (
    <WHLayout>
      <p className="text-sm text-muted-foreground">Good morning,</p>
      <h2 className="text-2xl font-bold mb-4">{first} <span className="text-wh-pink">🌸</span></h2>

      {/* Current cycle */}
      <Card className="p-5 mb-4 border-0 shadow-[var(--shadow-wh-card)]" style={{ background: "var(--gradient-wh-hero)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs text-foreground/70">Current Cycle</p>
            <p className="text-3xl font-extrabold leading-none">Day {cycle.cycleDay} <span className="text-base font-medium text-foreground/60">of {cycle.cycleLength}</span></p>
            <p className="text-wh-pink-deep font-semibold mt-2">{cycle.daysUntilOvulation > 0 ? `Ovulation in ${cycle.daysUntilOvulation} days` : cycle.status === "ovulation" ? "Ovulation today" : statusLabel(cycle.status)}</p>
            <p className="text-sm text-foreground/70">{statusLabel(cycle.status)}</p>
            <Button onClick={() => navigate("/womens-health/log-period")} className="mt-3 bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full">Log Today's Symptoms</Button>
          </div>
          <Ring pct={(cycle.cycleDay / cycle.cycleLength) * 100} color="hsl(var(--wh-pink))">
            <Flower2 className="h-7 w-7 text-wh-pink mb-1" />
            <p className="text-xs font-semibold leading-tight">{statusLabel(cycle.status)}</p>
          </Ring>
        </div>
      </Card>

      {/* Next period */}
      <Card className="p-4 mb-4 shadow-[var(--shadow-wh-soft)]">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Next Period</p>
            <p className="text-wh-pink font-bold text-base">{format(cycle.nextPeriod, "d MMM yyyy")}</p>
            <p className="text-[11px] text-muted-foreground">In {cycle.daysUntilNextPeriod} days</p>
          </div>
          <div className="border-l border-border pl-3">
            <p className="text-xs text-muted-foreground">Cycle Length</p>
            <p className="font-bold">{cycle.cycleLength} Days</p>
          </div>
          <div className="border-l border-border pl-3">
            <p className="text-xs text-muted-foreground">Period Length</p>
            <p className="font-bold">{cycle.periodLength} Days</p>
          </div>
        </div>
      </Card>

      {/* Quick actions */}
      <h3 className="text-sm font-semibold mb-2">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Period", to: "/womens-health/log-period", Icon: Droplet, color: "wh-pink" },
          { label: "Mood", to: "/womens-health/logs", Icon: Smile, color: "wh-purple" },
          { label: "Symptoms", to: "/womens-health/log-period", Icon: Sparkles, color: "wh-pink-deep" },
          { label: "Weight", to: "/womens-health/logs", Icon: Activity, color: "wh-blue" },
          { label: "Sleep", to: "/womens-health/logs", Icon: Moon, color: "wh-purple" },
          { label: "Water", to: "/womens-health/logs", Icon: Droplet, color: "wh-blue" },
        ].map(a => (
          <Link key={a.label} to={a.to} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-card border hover:shadow-[var(--shadow-wh-card)] transition-all">
            <a.Icon className={`h-5 w-5 mb-1 text-[hsl(var(--${a.color}))]`} />
            <span className="text-[11px] font-medium">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Today's summary */}
      <TodaysSummary />

      {/* Fertility entry */}
      <Card className="p-4 mt-4 cursor-pointer hover:shadow-[var(--shadow-wh-card)]" onClick={() => navigate("/womens-health/fertility")}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full grid place-items-center bg-wh-pink-soft"><Heart className="h-5 w-5 text-wh-pink" /></div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Fertility Tracker</p>
            <p className="text-xs text-muted-foreground">Ovulation, fertile window & conception chart</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </Card>

      <Card className="p-4 mt-2 cursor-pointer hover:shadow-[var(--shadow-wh-card)]" onClick={() => save({ mode: "pregnancy" }).then(() => navigate("/womens-health/pregnancy/onboarding"))}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full grid place-items-center bg-wh-purple-soft"><Baby className="h-5 w-5 text-wh-purple" /></div>
          <div className="flex-1">
            <p className="font-semibold text-sm">I'm pregnant</p>
            <p className="text-xs text-muted-foreground">Switch to pregnancy journey</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </Card>
    </WHLayout>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Today's summary widget — reads daily_health_logs
const TodaysSummary = () => {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: log } = useQuery({
    queryKey: ["wh-dhl", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any).from("daily_health_logs").select("*").eq("user_id", user!.id).eq("log_date", today).maybeSingle();
      return data;
    },
  });
  const items = [
    { label: "Sleep", value: log?.sleep_hours ? `${log.sleep_hours}h` : "—", Icon: Moon, color: "wh-purple" },
    { label: "Water", value: log?.water_glasses ? `${log.water_glasses}` : "—", Icon: Droplet, color: "wh-blue" },
    { label: "Mood", value: log?.mood ?? "—", Icon: Smile, color: "wh-pink" },
    { label: "Energy", value: log?.energy ?? "—", Icon: Activity, color: "wh-green" },
  ];
  return (
    <Card className="p-4">
      <p className="font-semibold text-sm mb-3">Today's Health Summary</p>
      <div className="grid grid-cols-4 gap-2">
        {items.map(i => (
          <div key={i.label} className="text-center">
            <i.Icon className={`h-5 w-5 mx-auto mb-1 text-[hsl(var(--${i.color}))]`} />
            <p className="text-[11px] text-muted-foreground">{i.label}</p>
            <p className="text-sm font-semibold">{i.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Onboarding
const WHOnboarding = ({ onSaved }: { onSaved: () => void }) => {
  const { save } = useWomensProfile();
  const [lastPeriod, setLastPeriod] = useState(format(addDays(new Date(), -10), "yyyy-MM-dd"));
  const [cycleLen, setCycleLen] = useState(28);
  const [periodLen, setPeriodLen] = useState(5);

  return (
    <WHLayout title="Set up Women's Health">
      <Card className="p-5 mb-4" style={{ background: "var(--gradient-wh-hero)" }}>
        <Flower2 className="h-8 w-8 text-wh-pink mb-2" />
        <h2 className="text-xl font-bold mb-1">Let's personalize your tracker</h2>
        <p className="text-sm text-muted-foreground">We'll predict your cycle, ovulation, and fertility window.</p>
      </Card>

      <Card className="p-4 space-y-4">
        <div>
          <Label>First day of last period</Label>
          <Input type="date" value={lastPeriod} onChange={e => setLastPeriod(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Average cycle length: <span className="text-wh-pink font-bold">{cycleLen} days</span></Label>
          <Slider value={[cycleLen]} min={21} max={40} step={1} onValueChange={v => setCycleLen(v[0])} className="mt-2" />
        </div>
        <div>
          <Label>Average period length: <span className="text-wh-pink font-bold">{periodLen} days</span></Label>
          <Slider value={[periodLen]} min={2} max={10} step={1} onValueChange={v => setPeriodLen(v[0])} className="mt-2" />
        </div>
        <Button
          className="w-full bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full"
          onClick={async () => {
            await save({ last_period_start: lastPeriod, avg_cycle_length: cycleLen, avg_period_length: periodLen, mode: "cycle" });
            toast({ title: "All set!", description: "Your cycle is now tracked." });
            onSaved();
          }}
        >
          Start Tracking
        </Button>
      </Card>
    </WHLayout>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// CALENDAR
const WHCalendar = () => {
  const { profile } = useWomensProfile();
  const [month, setMonth] = useState(new Date());
  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }), [month]);
  const cycle = profile?.last_period_start ? computeCycle(profile.last_period_start, profile.avg_cycle_length, profile.avg_period_length, month) : null;

  const dayClass = (d: Date) => {
    if (!cycle) return "";
    const isPeriod = d >= cycle.cycleStart && d <= addDays(cycle.cycleStart, cycle.periodLength - 1);
    const isOvulation = isSameDay(d, cycle.ovulationDate);
    const inFertile = d >= cycle.fertileStart && d <= cycle.fertileEnd && !isOvulation;
    if (isOvulation) return "bg-wh-purple text-white";
    if (isPeriod) return "bg-wh-pink/80 text-white";
    if (inFertile) return "bg-wh-green/30 text-wh-green";
    return "";
  };

  return (
    <WHLayout title="Calendar">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={() => setMonth(addDays(startOfMonth(month), -1))}><ChevronLeft className="h-5 w-5" /></Button>
          <p className="font-semibold">{format(month, "MMMM yyyy")}</p>
          <Button variant="ghost" size="icon" onClick={() => setMonth(addDays(endOfMonth(month), 1))}><ChevronRight className="h-5 w-5" /></Button>
        </div>
        <div className="grid grid-cols-7 text-[10px] text-muted-foreground text-center mb-1">
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(d => (
            <div key={d.toISOString()} className={`aspect-square rounded-full grid place-items-center text-sm ${isSameMonth(d, month) ? "" : "text-muted-foreground/40"} ${dayClass(d)}`}>
              {format(d, "d")}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-4 text-[11px]">
          <Legend color="wh-pink" label="Period" />
          <Legend color="wh-green" label="Fertile" />
          <Legend color="wh-purple" label="Ovulation" />
          <Legend color="wh-blue" label="Predicted" />
        </div>
      </Card>
    </WHLayout>
  );
};
const Legend = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full bg-[hsl(var(--${color}))]`} />{label}</div>
);

// ────────────────────────────────────────────────────────────────────────────
// LOG PERIOD
const SYMPTOMS = ["Cramps", "Headache", "Bloating", "Acne", "Back Pain", "Fatigue", "Breast Tenderness", "Nausea"];
const MOODS = ["Happy", "Calm", "Irritated", "Sad", "Stressed"];

const LogPeriod = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [flow, setFlow] = useState<string>("medium");
  const [pain, setPain] = useState(3);
  const [mood, setMood] = useState<string>("Calm");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const toggle = (s: string) => setSymptoms(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const save = async () => {
    if (!user) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const { error } = await (supabase as any).from("period_logs").upsert({
      user_id: user.id, log_date: today, flow, pain_level: pain, mood, symptoms,
    }, { onConflict: "user_id,log_date" });
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Logged", description: "Period entry saved." });
    navigate("/womens-health");
  };

  return (
    <WHLayout title="Log Period" showBack>
      <Card className="p-4 mb-3">
        <Label className="mb-2 block">Flow</Label>
        <div className="grid grid-cols-4 gap-2">
          {["spotting", "light", "medium", "heavy"].map(f => (
            <button key={f} onClick={() => setFlow(f)} className={`py-2 rounded-full text-xs capitalize border ${flow === f ? "bg-wh-pink text-white border-wh-pink" : "border-border"}`}>{f}</button>
          ))}
        </div>
      </Card>
      <Card className="p-4 mb-3">
        <Label className="mb-2 block">Pain Level: <span className="text-wh-pink font-bold">{pain}/10</span></Label>
        <Slider value={[pain]} min={0} max={10} step={1} onValueChange={v => setPain(v[0])} />
      </Card>
      <Card className="p-4 mb-3">
        <Label className="mb-2 block">Mood</Label>
        <div className="grid grid-cols-3 gap-2">
          {MOODS.map(m => (
            <button key={m} onClick={() => setMood(m)} className={`py-2 rounded-full text-xs border ${mood === m ? "bg-wh-purple text-white border-wh-purple" : "border-border"}`}>{m}</button>
          ))}
        </div>
      </Card>
      <Card className="p-4 mb-3">
        <Label className="mb-2 block">Symptoms</Label>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map(s => (
            <button key={s} onClick={() => toggle(s)} className={`px-3 py-1.5 rounded-full text-xs border ${symptoms.includes(s) ? "bg-wh-pink-soft text-wh-pink-deep border-wh-pink" : "border-border"}`}>{s}</button>
          ))}
        </div>
      </Card>
      <Button className="w-full bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full" onClick={save}>Save Entry</Button>
    </WHLayout>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// DAILY HEALTH LOG
const DailyLogPage = () => {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const [mood, setMood] = useState("Happy");
  const [energy, setEnergy] = useState("High");
  const [sleep, setSleep] = useState(7.5);
  const [weight, setWeight] = useState<number | "">("");
  const [water, setWater] = useState(6);
  const [exercise, setExercise] = useState(30);
  const [notes, setNotes] = useState("");

  const save = async () => {
    if (!user) return;
    const { error } = await (supabase as any).from("daily_health_logs").upsert({
      user_id: user.id, log_date: today, mood, energy, sleep_hours: sleep, weight_kg: weight || null, water_glasses: water, exercise_minutes: exercise, notes,
    }, { onConflict: "user_id,log_date" });
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Daily log saved" });
  };

  return (
    <WHLayout title="Daily Log">
      <Card className="p-4 mb-3 space-y-3">
        <div>
          <Label>Mood</Label>
          <div className="flex gap-2 mt-1 flex-wrap">{MOODS.map(m => <button key={m} onClick={() => setMood(m)} className={`px-3 py-1.5 rounded-full text-xs border ${mood === m ? "bg-wh-purple text-white" : "border-border"}`}>{m}</button>)}</div>
        </div>
        <div>
          <Label>Energy</Label>
          <div className="flex gap-2 mt-1">{["Low", "Medium", "High"].map(m => <button key={m} onClick={() => setEnergy(m)} className={`px-3 py-1.5 rounded-full text-xs border ${energy === m ? "bg-wh-green text-white" : "border-border"}`}>{m}</button>)}</div>
        </div>
        <div>
          <Label>Sleep (hours): <span className="font-bold text-wh-purple">{sleep}h</span></Label>
          <Slider value={[sleep]} min={0} max={12} step={0.5} onValueChange={v => setSleep(v[0])} />
        </div>
        <div>
          <Label>Water glasses: <span className="font-bold text-wh-blue">{water}</span></Label>
          <div className="flex items-center gap-3 mt-1">
            <Button size="icon" variant="outline" onClick={() => setWater(w => Math.max(0, w - 1))}><Minus className="h-4 w-4" /></Button>
            <Progress value={(water / 8) * 100} className="flex-1" />
            <Button size="icon" variant="outline" onClick={() => setWater(w => w + 1)}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <div>
          <Label>Weight (kg)</Label>
          <Input type="number" value={weight} onChange={e => setWeight(e.target.value ? Number(e.target.value) : "")} />
        </div>
        <div>
          <Label>Exercise (minutes): <span className="font-bold text-wh-green">{exercise}</span></Label>
          <Slider value={[exercise]} min={0} max={180} step={5} onValueChange={v => setExercise(v[0])} />
        </div>
        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything notable today…" />
        </div>
      </Card>
      <Button className="w-full bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full" onClick={save}>Save Today's Log</Button>
    </WHLayout>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// FERTILITY
const Fertility = () => {
  const { profile } = useWomensProfile();
  if (!profile?.last_period_start) return <WHLayout title="Fertility"><Card className="p-6 text-center"><p>Set up your cycle first.</p></Card></WHLayout>;
  const cycle = computeCycle(profile.last_period_start, profile.avg_cycle_length, profile.avg_period_length);
  const curve = conceptionCurve(cycle.ovulationDate).map(p => ({ ...p, dateStr: format(p.date, "MMM d") }));

  return (
    <WHLayout title="Fertility Tracker" showBack>
      <Card className="p-5 mb-4 border-0" style={{ background: "var(--gradient-wh-hero)" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Current Fertility Status</p>
            <p className="text-2xl font-extrabold text-wh-pink mt-1">{statusLabel(cycle.status)} <span className="text-base">🌸</span></p>
            <p className="text-sm text-muted-foreground mt-1">Your fertile window {cycle.status === "high" ? "is open" : "is approaching"}</p>
          </div>
          <Ring pct={Math.max(5, 100 - Math.abs(cycle.daysUntilOvulation) * 10)} color="hsl(var(--wh-pink))" size={140}>
            <p className="text-[10px] text-muted-foreground">Ovulation in</p>
            <p className="text-xl font-bold">{Math.max(0, cycle.daysUntilOvulation)} Days</p>
          </Ring>
        </div>
      </Card>

      <Card className="p-4 mb-4">
        <p className="font-semibold mb-3">Chance of Conception</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={curve}>
            <XAxis dataKey="dateStr" fontSize={10} />
            <YAxis hide domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="probability" stroke="hsl(var(--wh-pink))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--wh-pink))" }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Ovulation Date</p><p className="font-bold">{format(cycle.ovulationDate, "MMM d")}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Fertile Window</p><p className="font-bold text-sm">{format(cycle.fertileStart, "MMM d")} – {format(cycle.fertileEnd, "MMM d")}</p></Card>
      </div>

      <Card className="p-4 mt-3 bg-wh-pink-soft border-0">
        <p className="text-sm flex items-start gap-2"><Sparkles className="h-4 w-4 text-wh-pink mt-0.5" /><span>Your fertility peaks in <b>{Math.max(0, cycle.daysUntilOvulation)} days</b>. Consider tracking ovulation symptoms.</span></p>
      </Card>
    </WHLayout>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// INSIGHTS
const Insights = () => {
  const { user } = useAuth();
  const { profile } = useWomensProfile();
  const { data: logs } = useQuery({
    queryKey: ["wh-insights", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any).from("daily_health_logs").select("log_date,sleep_hours,weight_kg,mood").eq("user_id", user!.id).order("log_date", { ascending: true }).limit(30);
      return data ?? [];
    },
  });
  const chart = (logs ?? []).map((r: any) => ({ date: format(new Date(r.log_date), "M/d"), sleep: r.sleep_hours, weight: r.weight_kg }));
  const cycleData = Array.from({ length: 6 }).map((_, i) => ({ name: `C${i + 1}`, length: (profile?.avg_cycle_length ?? 28) + (i % 2 === 0 ? -1 : 1) }));

  return (
    <WHLayout title="Insights">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Stat label="Avg Cycle" value={`${profile?.avg_cycle_length ?? "—"} d`} />
        <Stat label="Avg Period" value={`${profile?.avg_period_length ?? "—"} d`} />
      </div>
      <Card className="p-4 mb-3">
        <p className="font-semibold mb-2 text-sm">Cycle Length History</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={cycleData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip />
            <Bar dataKey="length" fill="hsl(var(--wh-pink))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card className="p-4 mb-3">
        <p className="font-semibold mb-2 text-sm">Sleep Trend (30 d)</p>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={chart}>
            <XAxis dataKey="date" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip />
            <Line type="monotone" dataKey="sleep" stroke="hsl(var(--wh-purple))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card className="p-4 bg-wh-blue-soft border-0">
        <p className="text-sm flex items-start gap-2"><Sparkles className="h-4 w-4 text-wh-blue mt-0.5" /><span>Your cycle has remained regular for the last several months — great consistency!</span></p>
      </Card>
    </WHLayout>
  );
};
const Stat = ({ label, value }: { label: string; value: string }) => (
  <Card className="p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-bold text-lg">{value}</p></Card>
);

// ────────────────────────────────────────────────────────────────────────────
// PROFILE
const WHProfile = () => {
  const { user, userProfile } = useAuth();
  const { profile, save } = useWomensProfile();
  const [height, setHeight] = useState<number | "">(profile?.height_cm ?? "");
  const [weight, setWeight] = useState<number | "">(profile?.weight_kg ?? "");

  return (
    <WHLayout title="Profile">
      <Card className="p-4 mb-3">
        <p className="text-xs text-muted-foreground">Name</p>
        <p className="font-semibold">{(userProfile as any)?.first_name} {(userProfile as any)?.last_name}</p>
        <p className="text-xs text-muted-foreground mt-3">Email</p>
        <p className="text-sm">{user?.email}</p>
      </Card>
      <Card className="p-4 mb-3 space-y-3">
        <div><Label>Height (cm)</Label><Input type="number" value={height} onChange={e => setHeight(e.target.value ? Number(e.target.value) : "")} /></div>
        <div><Label>Weight (kg)</Label><Input type="number" value={weight} onChange={e => setWeight(e.target.value ? Number(e.target.value) : "")} /></div>
        <div><Label>Avg Cycle Length</Label><Input type="number" value={profile?.avg_cycle_length ?? 28} onChange={e => save({ avg_cycle_length: Number(e.target.value) })} /></div>
        <div><Label>Avg Period Length</Label><Input type="number" value={profile?.avg_period_length ?? 5} onChange={e => save({ avg_period_length: Number(e.target.value) })} /></div>
        <Button className="w-full bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full" onClick={() => save({ height_cm: Number(height) || null, weight_kg: Number(weight) || null })}>Save Profile</Button>
      </Card>
      <Card className="p-4 mb-3 flex items-center justify-between">
        <div><p className="font-semibold text-sm">Notifications</p><p className="text-xs text-muted-foreground">Period & ovulation reminders</p></div>
        <Switch checked={profile?.notifications_enabled ?? true} onCheckedChange={(v) => save({ notifications_enabled: v })} />
      </Card>
      <Card className="p-4 flex items-center justify-between cursor-pointer" onClick={() => save({ mode: profile?.mode === "pregnancy" ? "cycle" : "pregnancy" })}>
        <div><p className="font-semibold text-sm">{profile?.mode === "pregnancy" ? "Switch back to Cycle Mode" : "Switch to Pregnancy Mode"}</p><p className="text-xs text-muted-foreground">Change tracker focus</p></div>
        <Badge className="bg-wh-pink text-white">{profile?.mode}</Badge>
      </Card>
    </WHLayout>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// PREGNANCY
const PregnancyOnboarding = () => {
  const { save } = usePregnancyProfile();
  const navigate = useNavigate();
  const [lmp, setLmp] = useState(format(addDays(new Date(), -24 * 7), "yyyy-MM-dd"));
  const [useDue, setUseDue] = useState(false);
  const [due, setDue] = useState(format(addDays(new Date(), 16 * 7), "yyyy-MM-dd"));

  return (
    <WHLayout title="Pregnancy Setup" showBack>
      <Card className="p-5 mb-4" style={{ background: "var(--gradient-wh-hero)" }}>
        <Baby className="h-8 w-8 text-wh-pink mb-2" />
        <h2 className="text-xl font-bold">Welcome to your pregnancy journey</h2>
        <p className="text-sm text-muted-foreground">We'll track baby growth week by week.</p>
      </Card>
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label>Use due date instead of LMP</Label>
          <Switch checked={useDue} onCheckedChange={setUseDue} />
        </div>
        {!useDue ? (
          <div><Label>First day of last menstrual period</Label><Input type="date" value={lmp} onChange={e => setLmp(e.target.value)} /></div>
        ) : (
          <div><Label>Due date</Label><Input type="date" value={due} onChange={e => setDue(e.target.value)} /></div>
        )}
        <Button className="w-full bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full" onClick={async () => {
          await save(useDue ? { due_date: due, lmp_date: null } : { lmp_date: lmp, due_date: null });
          toast({ title: "Pregnancy started 🎉" });
          navigate("/womens-health");
        }}>Start Pregnancy Journey</Button>
      </Card>
    </WHLayout>
  );
};

const PregnancyHome = () => {
  const { profile: preg } = usePregnancyProfile();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  if (!preg) return <Navigate to="/womens-health/pregnancy/onboarding" replace />;
  const state = computePregnancy({ lmpDate: preg.lmp_date, dueDate: preg.due_date });
  if (!state) return <Navigate to="/womens-health/pregnancy/onboarding" replace />;
  return (
    <WHLayout title="Pregnancy">
      <p className="text-sm text-muted-foreground">Good morning,</p>
      <h2 className="text-2xl font-bold mb-4">{(userProfile as any)?.first_name || "Mum"} 🌸</h2>
      <Card className="p-5 mb-4 border-0" style={{ background: "var(--gradient-wh-hero)" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-extrabold text-wh-pink-deep">Week {state.week}</p>
            <p className="text-wh-pink font-semibold">{trimesterLabel(state.trimester)}</p>
            <p className="text-sm text-muted-foreground mt-1">{state.weeksRemaining} weeks to go!</p>
            <div className="flex gap-3 mt-3 text-xs">
              <div className="bg-card rounded-xl p-2 px-3"><p className="text-muted-foreground">Due Date</p><p className="font-bold">{format(state.dueDate, "d MMM yyyy")}</p></div>
              <div className="bg-card rounded-xl p-2 px-3"><p className="text-muted-foreground">Days Remaining</p><p className="font-bold">{state.daysRemaining}</p></div>
            </div>
            <Progress value={state.progressPct} className="mt-3" />
            <p className="text-[11px] text-muted-foreground mt-1">{state.week} of 40 weeks · {state.progressPct}%</p>
          </div>
          <div className="text-6xl">👶</div>
        </div>
      </Card>
      <BabySizeCard week={state.week} />
      <Card className="p-4 mt-3 cursor-pointer" onClick={() => navigate("/womens-health/pregnancy/baby-growth")}>
        <div className="flex items-center gap-3"><Baby className="h-5 w-5 text-wh-pink" /><div className="flex-1"><p className="font-semibold text-sm">Baby Growth Timeline</p><p className="text-xs text-muted-foreground">Week-by-week development</p></div><ChevronRight className="h-5 w-5 text-muted-foreground" /></div>
      </Card>
    </WHLayout>
  );
};

const BabySizeCard = ({ week }: { week: number }) => {
  const { data } = useQuery({
    queryKey: ["baby-growth", week],
    queryFn: async () => {
      const { data } = await (supabase as any).from("baby_growth_data").select("*").eq("week", week).maybeSingle();
      return data;
    },
  });
  if (!data) return null;
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">Your baby is the size of a</p>
      <p className="text-xl font-bold text-wh-purple">{data.size_comparison} <span className="text-2xl">{data.size_emoji}</span></p>
      <div className="flex gap-4 mt-2 text-xs">
        <div><p className="text-muted-foreground">Length</p><p className="font-bold">{data.length_cm} cm</p></div>
        <div><p className="text-muted-foreground">Weight</p><p className="font-bold">{data.weight_g} g</p></div>
      </div>
      {data.development && <p className="text-sm mt-3 text-foreground/80">{data.development}</p>}
    </Card>
  );
};

const BabyGrowthTimeline = () => {
  const { profile: preg } = usePregnancyProfile();
  const state = preg ? computePregnancy({ lmpDate: preg.lmp_date, dueDate: preg.due_date }) : null;
  const { data: all = [] } = useQuery({
    queryKey: ["baby-growth-all"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("baby_growth_data").select("*").order("week");
      return data ?? [];
    },
  });
  return (
    <WHLayout title="Baby Growth" showBack>
      <div className="space-y-2">
        {all.map((w: any) => (
          <Card key={w.week} className={`p-3 ${state?.week === w.week ? "border-wh-pink border-2" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-wh-pink-soft grid place-items-center text-2xl">{w.size_emoji}</div>
              <div className="flex-1">
                <p className="font-bold">Week {w.week} <span className="text-xs text-muted-foreground font-normal">· {w.size_comparison}</span></p>
                <p className="text-[11px] text-muted-foreground">{w.length_cm} cm · {w.weight_g} g</p>
                {w.milestones?.length > 0 && <p className="text-xs mt-1 text-foreground/70">{w.milestones.slice(0, 2).join(" • ")}</p>}
              </div>
              {state?.week === w.week && <Badge className="bg-wh-pink text-white">Now</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </WHLayout>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Router
const WomensHealth = () => (
  <Routes>
    <Route index element={<WHHome />} />
    <Route path="calendar" element={<WHCalendar />} />
    <Route path="insights" element={<Insights />} />
    <Route path="logs" element={<DailyLogPage />} />
    <Route path="profile" element={<WHProfile />} />
    <Route path="log-period" element={<LogPeriod />} />
    <Route path="fertility" element={<Fertility />} />
    <Route path="pregnancy/onboarding" element={<PregnancyOnboarding />} />
    <Route path="pregnancy/baby-growth" element={<BabyGrowthTimeline />} />
  </Routes>
);

export default WomensHealth;
