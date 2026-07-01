import { useMemo, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Droplet, Moon, Smile, Activity, Plus, Minus, Heart, Flower2, Baby,
  Calendar as CalIcon, ChevronLeft, ChevronRight, Sparkles, Zap,
  Bell, MoreVertical, Info, Share2, ClipboardList, Apple, CheckSquare,
} from "lucide-react";
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, isToday } from "date-fns";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid, ReferenceDot } from "recharts";
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
import GiftOnboarding from "@/components/womens-health/GiftOnboarding";
import PeriodTodayFlo from "@/components/womens-health/PeriodTodayFlo";
import SecretChats from "@/pages/womens-health/SecretChats";
import { useQuery } from "@tanstack/react-query";

// ────────────────────────────────────────────────────────────────────────────
// Inline top tab strip used at the top of each main page
const TopTabs = ({ tabs }: { tabs: { to: string; label: string; end?: boolean }[] }) => (
  <div className="-mx-4 px-4 border-b border-border/60 mb-4 overflow-x-auto no-scrollbar">
    <div className="flex gap-6 min-w-max">
      {tabs.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `relative pb-2.5 pt-1 text-[15px] font-medium transition-colors ${
              isActive ? "text-wh-pink" : "text-muted-foreground"
            }`
          }
        >
          {({ isActive }) => (
            <>
              {t.label}
              {isActive && <motion.span layoutId="wh-tab-underline" className="absolute left-0 right-0 -bottom-px h-[3px] rounded-full bg-wh-pink" />}
            </>
          )}
        </NavLink>
      ))}
    </div>
  </div>
);

// Reusable ring
const Ring = ({ pct, color, children, size = 200, track = "hsl(var(--muted))" }: { pct: number; color: string; children: React.ReactNode; size?: number; track?: string }) => {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="overflow-visible">
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={10} fill="none" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={10} strokeLinecap="round" fill="none"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (c * Math.min(100, Math.max(0, pct))) / 100 }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
      <circle cx={size / 2 + r * Math.cos(((pct / 100) * 360 - 90) * Math.PI / 180)} cy={size / 2 + r * Math.sin(((pct / 100) * 360 - 90) * Math.PI / 180)} r={6} fill={color} />
      <foreignObject x={0} y={0} width={size} height={size}>
        <div className="w-full h-full flex flex-col items-center justify-center text-center px-4">{children}</div>
      </foreignObject>
    </svg>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// PERIOD TRACKING — OVERVIEW
const PERIOD_TABS = [
  { to: "/womens-health/home", label: "Overview", end: true },
  { to: "/womens-health/home/calendar", label: "Calendar" },
  { to: "/womens-health/home/insights", label: "Insights" },
  { to: "/womens-health/home/history", label: "History" },
];

const PeriodOverview = () => {
  const { profile, loading } = useWomensProfile();
  const navigate = useNavigate();

  if (loading) return <WHLayout title="Period Tracking"><Card className="h-48 animate-pulse" /></WHLayout>;
  if (!profile?.last_period_start) return <GiftOnboarding onFinished={() => navigate("/womens-health/home")} />;

  return (
    <WHLayout title="Period Tracking">
      <TopTabs tabs={PERIOD_TABS} />
      <PeriodTodayFlo />
      <div className="mt-4"><MiniCalendar /></div>
      <TodaysLogRow />
    </WHLayout>
  );
};


const MiniCalendar = () => {
  const { profile } = useWomensProfile();
  const [month, setMonth] = useState(new Date());
  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }), [month]);
  const cycle = profile?.last_period_start ? computeCycle(profile.last_period_start, profile.avg_cycle_length, profile.avg_period_length, month) : null;

  const cls = (d: Date) => {
    if (!cycle) return { wrap: "", text: "" };
    const periodEnd = addDays(cycle.cycleStart, cycle.periodLength - 1);
    const nextPeriodEnd = addDays(cycle.nextPeriod, cycle.periodLength - 1);
    const isPeriod = (d >= cycle.cycleStart && d <= periodEnd) || (d >= cycle.nextPeriod && d <= nextPeriodEnd);
    const isOvulation = isSameDay(d, cycle.ovulationDate);
    const inFertile = d >= cycle.fertileStart && d <= cycle.fertileEnd && !isOvulation;
    const isExpectedOvulation = isOvulation && d > new Date();
    if (isExpectedOvulation) return { wrap: "border-2 border-dashed border-wh-green", text: "text-foreground" };
    if (isOvulation) return { wrap: "bg-wh-purple", text: "text-white" };
    if (isPeriod) return { wrap: "bg-wh-pink/80", text: "text-white" };
    if (inFertile) return { wrap: "bg-wh-green/25", text: "text-wh-green" };
    return { wrap: "", text: "" };
  };

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-base">{format(month, "MMMM yyyy")}</p>
        <div className="flex gap-1">
          <button onClick={() => setMonth(addDays(startOfMonth(month), -1))} className="p-1.5 rounded-full hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setMonth(addDays(endOfMonth(month), 1))} className="p-1.5 rounded-full hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-[10px] text-muted-foreground text-center mb-1 font-medium">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const c = cls(d);
          return (
            <div key={d.toISOString()} className={`aspect-square rounded-full grid place-items-center text-sm font-medium ${isSameMonth(d, month) ? "" : "text-muted-foreground/40"} ${c.wrap} ${c.text}`}>
              {format(d, "d")}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-[11px]">
        <Legend dotClass="bg-wh-pink" label="Period" />
        <Legend dotClass="bg-wh-green/60" label="Fertile Window" />
        <Legend dotClass="bg-wh-purple" label="Ovulation" />
        <Legend dotClass="border-2 border-dashed border-wh-green bg-transparent" label="Expected Ovulation" />
      </div>
    </Card>
  );
};
const Legend = ({ dotClass, label }: { dotClass: string; label: string }) => (
  <div className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />{label}</div>
);

const TodaysLogRow = () => {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: dhl } = useQuery({
    queryKey: ["wh-dhl", user?.id, today],
    enabled: !!user,
    queryFn: async () => (await (supabase as any).from("daily_health_logs").select("*").eq("user_id", user!.id).eq("log_date", today).maybeSingle()).data,
  });
  const { data: pl } = useQuery({
    queryKey: ["wh-pl", user?.id, today],
    enabled: !!user,
    queryFn: async () => (await (supabase as any).from("period_logs").select("*").eq("user_id", user!.id).eq("log_date", today).maybeSingle()).data,
  });

  const tiles = [
    { label: "Flow", value: pl?.flow ?? "—", Icon: Droplet, tone: "text-wh-pink" },
    { label: "Mood", value: dhl?.mood ?? pl?.mood ?? "—", Icon: Smile, tone: "text-wh-purple" },
    { label: "Energy", value: dhl?.energy ?? "—", Icon: Zap, tone: "text-wh-blue" },
    { label: "Sleep", value: dhl?.sleep_hours ? `${dhl.sleep_hours}h` : "—", Icon: Moon, tone: "text-wh-orange" },
    { label: "Symptoms", value: pl?.symptoms?.length ? `${pl.symptoms.length}` : "—", Icon: Activity, tone: "text-wh-green" },
  ];

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold">Today's Log</p>
        <Link to="/womens-health/logs" className="text-xs text-wh-pink font-semibold border border-wh-pink rounded-full px-3 py-1 flex items-center gap-1"><Plus className="h-3 w-3" />Log Now</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {tiles.map(t => (
          <div key={t.label} className="flex-shrink-0 w-[68px] rounded-2xl border bg-card p-3 flex flex-col items-center gap-1.5">
            <t.Icon className={`h-6 w-6 ${t.tone}`} />
            <p className="text-[11px] font-semibold leading-none">{t.label}</p>
            <p className="text-[10px] text-muted-foreground capitalize text-center leading-tight truncate w-full">{t.value}</p>
          </div>
        ))}
        <Link to="/womens-health/logs" className="flex-shrink-0 w-[68px] rounded-2xl border-2 border-dashed border-border bg-card/40 p-3 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
          <Plus className="h-5 w-5" />
          <p className="text-[11px] font-medium">Add Note</p>
        </Link>
      </div>
    </Card>
  );
};

// CALENDAR / INSIGHTS / HISTORY pages for Period section
const PeriodCalendarPage = () => (
  <WHLayout title="Period Tracking"><TopTabs tabs={PERIOD_TABS} /><MiniCalendar /></WHLayout>
);

const PeriodHistory = () => {
  const { user } = useAuth();
  const { data: logs = [] } = useQuery({
    queryKey: ["period-history", user?.id],
    enabled: !!user,
    queryFn: async () => (await (supabase as any).from("period_logs").select("*").eq("user_id", user!.id).order("log_date", { ascending: false }).limit(60)).data ?? [],
  });
  return (
    <WHLayout title="Period Tracking">
      <TopTabs tabs={PERIOD_TABS} />
      {logs.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No period logs yet. Tap <span className="text-wh-pink font-semibold">Log Period</span> to start.</Card>
      ) : (
        <div className="space-y-2">
          {logs.map((l: any) => (
            <Card key={l.id} className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-wh-pink-soft grid place-items-center"><Droplet className="h-5 w-5 text-wh-pink" /></div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{format(new Date(l.log_date), "EEE, d MMM yyyy")}</p>
                <p className="text-xs text-muted-foreground capitalize">Flow: {l.flow ?? "—"} · Pain {l.pain_level ?? 0}/10 · {l.mood ?? "—"}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </WHLayout>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// FERTILITY TRACKER
const FERTILITY_TABS = [
  { to: "/womens-health/fertility", label: "Today", end: true },
  { to: "/womens-health/fertility/calendar", label: "Calendar" },
  { to: "/womens-health/fertility/ovulation", label: "Ovulation" },
  { to: "/womens-health/fertility/insights", label: "Insights" },
];

const FertilityToday = () => {
  const { profile, loading } = useWomensProfile();
  const navigate = useNavigate();

  if (loading) return <WHLayout title="Fertility Tracker" showBack><Card className="h-48 animate-pulse" /></WHLayout>;
  if (!profile?.last_period_start) {
    return (
      <WHLayout title="Fertility Tracker" showBack>
        <Card className="p-6 text-center">
          <Heart className="h-10 w-10 text-wh-pink mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Set up your cycle to see fertility insights.</p>
          <Button className="bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full" onClick={() => navigate("/womens-health/home")}>Set Up Cycle</Button>
        </Card>
      </WHLayout>
    );
  }

  const cycle = computeCycle(profile.last_period_start, profile.avg_cycle_length, profile.avg_period_length);
  const fertilePct = Math.min(100, Math.max(8, 100 - Math.abs(cycle.daysUntilOvulation) * 8));
  const today = new Date();

  // 8-day strip centred around ovulation
  const stripDays = Array.from({ length: 8 }).map((_, i) => addDays(cycle.fertileStart, i - 1));
  const stripCls = (d: Date) => {
    if (isSameDay(d, cycle.ovulationDate)) return { wrap: "border-2 border-wh-purple bg-card", text: "text-foreground", label: "OVULATION" as const };
    const inFertile = d >= cycle.fertileStart && d <= cycle.fertileEnd;
    if (inFertile && d <= cycle.ovulationDate) return { wrap: "bg-wh-green/25", text: "text-wh-green", label: undefined };
    if (inFertile) return { wrap: "bg-wh-green", text: "text-white", label: undefined };
    return { wrap: "bg-muted/60", text: "text-muted-foreground", label: undefined };
  };

  // Conception curve
  const curve = conceptionCurve(cycle.ovulationDate).map(p => ({ ...p, dateStr: format(p.date, "MMM d"), dayStr: `Day ${Math.round((p.date.getTime() - cycle.cycleStart.getTime()) / 86400000) + 1}` }));
  const peakIdx = curve.reduce((m, c, i, a) => c.probability > a[m].probability ? i : m, 0);

  const isHigh = cycle.status === "high" || cycle.status === "ovulation";

  return (
    <WHLayout title="Fertility Tracker">
      <TopTabs tabs={FERTILITY_TABS} />

      {/* Hero */}
      <Card className="p-5 mb-4 border-0 shadow-[var(--shadow-wh-card)]" style={{ background: "var(--gradient-wh-hero)" }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground/80">Current Fertility Status</p>
            <p className="text-[28px] font-extrabold text-wh-pink leading-tight mt-1">{statusLabel(cycle.status)} <span className="text-2xl">🌸</span></p>
            <p className="text-sm text-foreground/75 mt-1">{isHigh ? "Your fertile window is open" : "Your fertile window is approaching"}</p>
            {isHigh && <p className="text-sm text-foreground/75">Great time to try to conceive!</p>}
            <Button variant="outline" onClick={() => navigate("/womens-health/log-period")} className="mt-4 rounded-full border-wh-pink text-wh-pink hover:bg-wh-pink-soft">Log Symptoms</Button>
          </div>
          <Ring pct={fertilePct} color="hsl(var(--wh-pink))" size={150} track="hsl(var(--wh-pink)/0.15)">
            <p className="text-[10px] text-foreground/70">Ovulation in</p>
            <p className="text-xl font-extrabold leading-none my-1">{Math.max(0, cycle.daysUntilOvulation)} Days</p>
            <p className="text-[10px] text-foreground/70 leading-tight">{isHigh ? "High chance of conception" : "Tracking your cycle"}</p>
          </Ring>
        </div>
      </Card>

      {/* Fertile window strip */}
      <Card className="p-4 mb-4">
        <p className="font-bold mb-3">Your Fertile Window</p>
        <div className="relative">
          <div className="absolute left-0 right-0 text-center -top-1">
            {(() => {
              const idx = stripDays.findIndex(d => isSameDay(d, cycle.ovulationDate));
              if (idx < 0) return null;
              return (
                <div style={{ marginLeft: `${(idx + 0.5) * (100 / stripDays.length)}%` }} className="-translate-x-1/2 inline-block">
                  <p className="text-[10px] font-bold text-foreground/70">OVULATION</p>
                  <p className="text-foreground/60">▼</p>
                </div>
              );
            })()}
          </div>
          <div className="grid grid-cols-8 gap-1 pt-7">
            {stripDays.map(d => {
              const c = stripCls(d);
              return (
                <div key={d.toISOString()} className="flex flex-col items-center">
                  <div className={`h-10 w-10 rounded-full grid place-items-center text-sm font-semibold ${c.wrap} ${c.text}`}>{format(d, "d")}</div>
                  <p className="text-[10px] text-muted-foreground mt-1">{format(d, "EEE")}</p>
                  {isSameDay(d, cycle.ovulationDate) && <Heart className="h-3 w-3 text-wh-pink fill-wh-pink mt-0.5" />}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-2 mt-4 text-[11px]">
          <Legend dotClass="bg-wh-green/30" label="Fertile Window" />
          <Legend dotClass="bg-wh-green" label="High Fertility" />
          <Legend dotClass="border-2 border-wh-purple bg-transparent" label="Ovulation Day" />
          <Legend dotClass="bg-muted-foreground/40" label="Low Fertility" />
        </div>
      </Card>

      {/* 4 stat cards */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <StatCard Icon={CalIcon} tone="text-wh-pink" label="Ovulation Date" value={format(cycle.ovulationDate, "MMM d")} sub={format(cycle.ovulationDate, "EEEE")} />
        <StatCard Icon={Flower2} tone="text-wh-pink" label="Fertile Window" value={`${format(cycle.fertileStart, "MMM d")}–${format(cycle.fertileEnd, "d")}`} sub={`${Math.round((cycle.fertileEnd.getTime() - cycle.fertileStart.getTime()) / 86400000) + 1} Days`} />
        <StatCard Icon={Heart} tone="text-wh-pink" label="Conception" value={isHigh ? "High" : "Low"} sub="Probability" />
        <StatCard Icon={Activity} tone="text-wh-pink" label="Cycle Day" value={`Day ${cycle.cycleDay}`} sub={`of ${cycle.cycleLength}`} />
      </div>

      {/* Conception chart */}
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-1.5 mb-2"><p className="font-bold">Chance of Conception</p><Info className="h-3.5 w-3.5 text-muted-foreground" /></div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={curve} margin={{ top: 20, right: 10, left: 0, bottom: 30 }}>
            <XAxis dataKey="dateStr" fontSize={9} tickLine={false} axisLine={false} interval={0} />
            <YAxis hide domain={[0, 100]} />
            <Tooltip formatter={(v: any) => `${v}%`} />
            <Line type="monotone" dataKey="probability" stroke="hsl(var(--wh-pink))" strokeWidth={2.5} strokeDasharray="3 3" dot={{ r: 4, fill: "hsl(var(--wh-pink))", strokeWidth: 0 }} label={{ position: "top", fontSize: 10, fill: "hsl(var(--foreground))", formatter: (v: any) => `${v}%` }} />
            <ReferenceDot x={curve[peakIdx]?.dateStr} y={curve[peakIdx]?.probability} r={6} fill="hsl(var(--wh-pink))" stroke="hsl(var(--wh-pink-soft))" strokeWidth={4} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex justify-center mt-1">
          <Badge className="bg-wh-pink text-white text-[10px] tracking-wider">PEAK</Badge>
        </div>
      </Card>

      {/* Insights */}
      <Card className="p-4 mb-4 bg-wh-pink-soft border-0">
        <div className="flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4 text-wh-pink" /><p className="font-bold">Fertility Insights</p></div>
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2"><ClipboardList className="h-4 w-4 text-wh-purple flex-shrink-0 mt-0.5" /><span>Your fertility is highest <b>1 day before</b> ovulation.</span></li>
          <li className="flex gap-2"><CalIcon className="h-4 w-4 text-wh-purple flex-shrink-0 mt-0.5" /><span>You usually ovulate around <b>Day {cycle.cycleLength - 14}</b> of your cycle.</span></li>
          <li className="flex gap-2"><Heart className="h-4 w-4 text-wh-purple flex-shrink-0 mt-0.5" /><span>Having intercourse every 1–2 days increases your chances.</span></li>
        </ul>
      </Card>
    </WHLayout>
  );
};

const StatCard = ({ Icon, tone, label, value, sub }: any) => (
  <Card className="p-2.5 flex flex-col">
    <Icon className={`h-4 w-4 ${tone} mb-1`} />
    <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    <p className="font-bold text-[13px] leading-tight mt-0.5">{value}</p>
    <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
  </Card>
);

// ────────────────────────────────────────────────────────────────────────────
// ONBOARDING
const WHOnboarding = ({ onSaved }: { onSaved: () => void }) => {
  const { save } = useWomensProfile();
  const [lastPeriod, setLastPeriod] = useState<string>("");
  const [cycleLen, setCycleLen] = useState(28);
  const [periodLen, setPeriodLen] = useState(5);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <WHLayout title="Set up Cycle Tracking" showBack>
      <Card className="p-5 mb-4 border-0" style={{ background: "var(--gradient-wh-hero)" }}>
        <Flower2 className="h-8 w-8 text-wh-pink mb-2" />
        <h2 className="text-xl font-bold mb-1">Let's personalize your tracker</h2>
        <p className="text-sm text-muted-foreground">Enter the first day of your last period so we can predict your cycle, ovulation, and fertility window.</p>
      </Card>
      <Card className="p-4 space-y-4">
        <div>
          <Label>First day of your last period</Label>
          <Input type="date" max={todayStr} value={lastPeriod} onChange={e => setLastPeriod(e.target.value)} className="mt-1" />
          {!lastPeriod && <p className="text-[11px] text-muted-foreground mt-1">Pick the date your last period started.</p>}
        </div>
        <div><Label>Average cycle length: <span className="text-wh-pink font-bold">{cycleLen} days</span></Label><Slider value={[cycleLen]} min={21} max={40} step={1} onValueChange={v => setCycleLen(v[0])} className="mt-2" /></div>
        <div><Label>Average period length: <span className="text-wh-pink font-bold">{periodLen} days</span></Label><Slider value={[periodLen]} min={2} max={10} step={1} onValueChange={v => setPeriodLen(v[0])} className="mt-2" /></div>
        <Button
          className="w-full bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full"
          disabled={!lastPeriod}
          onClick={async () => {
            if (!lastPeriod) { toast({ title: "Pick a date", description: "Please enter the first day of your last period.", variant: "destructive" }); return; }
            await save({ last_period_start: lastPeriod, avg_cycle_length: cycleLen, avg_period_length: periodLen, mode: "cycle" });
            toast({ title: "All set!", description: "Your cycle is now tracked." });
            onSaved();
          }}
        >Start Tracking</Button>
      </Card>
    </WHLayout>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// LOG PERIOD
const SYMPTOMS = ["Cramps", "Headache", "Bloating", "Acne", "Back Pain", "Fatigue", "Breast Tenderness", "Nausea"];
const MOODS = ["Happy", "Calm", "Irritated", "Sad", "Stressed"];

const LogPeriod = () => {
  const { user } = useAuth();
  const { profile, save: saveProfile } = useWomensProfile();
  const navigate = useNavigate();
  const [logDate, setLogDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [isStartDay, setIsStartDay] = useState(true);
  const [flow, setFlow] = useState<string>("medium");
  const [pain, setPain] = useState(3);
  const [mood, setMood] = useState<string>("Calm");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const toggle = (s: string) => setSymptoms(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const save = async () => {
    if (!user) return;
    if (!logDate) { toast({ title: "Pick a date", description: "Choose the date this entry is for.", variant: "destructive" }); return; }
    const { error } = await (supabase as any).from("period_logs").upsert({
      user_id: user.id, log_date: logDate, flow, pain_level: pain, mood, symptoms,
    }, { onConflict: "user_id,log_date" });
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    // If this is the start day of the period, update the profile's last_period_start
    if (isStartDay && (!profile?.last_period_start || logDate >= profile.last_period_start)) {
      await saveProfile({ last_period_start: logDate });
    }
    toast({ title: "Logged", description: "Period entry saved." });
    navigate(-1);
  };

  return (
    <WHLayout title="Log Period" showBack>
      <Card className="p-4 mb-3 space-y-3">
        <div>
          <Label>Date</Label>
          <Input type="date" max={todayStr} value={logDate} onChange={e => setLogDate(e.target.value)} className="mt-1" />
        </div>
        <div className="flex items-center justify-between">
          <Label className="cursor-pointer">This is the first day of my period</Label>
          <Switch checked={isStartDay} onCheckedChange={setIsStartDay} />
        </div>
      </Card>
      <Card className="p-4 mb-3">
        <Label className="mb-2 block">Flow</Label>
        <div className="grid grid-cols-4 gap-2">
          {["spotting", "light", "medium", "heavy"].map(f => (
            <button key={f} type="button" onClick={() => setFlow(f)} className={`py-2 rounded-full text-xs capitalize border ${flow === f ? "bg-wh-pink text-white border-wh-pink" : "border-border"}`}>{f}</button>
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
            <button key={m} type="button" onClick={() => setMood(m)} className={`py-2 rounded-full text-xs border ${mood === m ? "bg-wh-purple text-white border-wh-purple" : "border-border"}`}>{m}</button>
          ))}
        </div>
      </Card>
      <Card className="p-4 mb-3">
        <Label className="mb-2 block">Symptoms</Label>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map(s => (
            <button key={s} type="button" onClick={() => toggle(s)} className={`px-3 py-1.5 rounded-full text-xs border ${symptoms.includes(s) ? "bg-wh-pink-soft text-wh-pink-deep border-wh-pink" : "border-border"}`}>{s}</button>
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
    <WHLayout title="Daily Log" showBack>
      <Card className="p-4 mb-3 space-y-3">
        <div><Label>Mood</Label><div className="flex gap-2 mt-1 flex-wrap">{MOODS.map(m => <button key={m} onClick={() => setMood(m)} className={`px-3 py-1.5 rounded-full text-xs border ${mood === m ? "bg-wh-purple text-white" : "border-border"}`}>{m}</button>)}</div></div>
        <div><Label>Energy</Label><div className="flex gap-2 mt-1">{["Low", "Medium", "High"].map(m => <button key={m} onClick={() => setEnergy(m)} className={`px-3 py-1.5 rounded-full text-xs border ${energy === m ? "bg-wh-green text-white" : "border-border"}`}>{m}</button>)}</div></div>
        <div><Label>Sleep (hours): <span className="font-bold text-wh-purple">{sleep}h</span></Label><Slider value={[sleep]} min={0} max={12} step={0.5} onValueChange={v => setSleep(v[0])} /></div>
        <div><Label>Water glasses: <span className="font-bold text-wh-blue">{water}</span></Label>
          <div className="flex items-center gap-3 mt-1">
            <Button size="icon" variant="outline" onClick={() => setWater(w => Math.max(0, w - 1))}><Minus className="h-4 w-4" /></Button>
            <Progress value={(water / 8) * 100} className="flex-1" />
            <Button size="icon" variant="outline" onClick={() => setWater(w => w + 1)}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <div><Label>Weight (kg)</Label><Input type="number" value={weight} onChange={e => setWeight(e.target.value ? Number(e.target.value) : "")} /></div>
        <div><Label>Exercise (minutes): <span className="font-bold text-wh-green">{exercise}</span></Label><Slider value={[exercise]} min={0} max={180} step={5} onValueChange={v => setExercise(v[0])} /></div>
        <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything notable today…" /></div>
      </Card>
      <Button className="w-full bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full" onClick={save}>Save Today's Log</Button>
    </WHLayout>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// INSIGHTS (Period section)
const PeriodInsights = () => {
  const { user } = useAuth();
  const { profile } = useWomensProfile();
  const { data: logs = [] } = useQuery({
    queryKey: ["wh-insights", user?.id],
    enabled: !!user,
    queryFn: async () => (await (supabase as any).from("daily_health_logs").select("log_date,sleep_hours,weight_kg,mood").eq("user_id", user!.id).order("log_date", { ascending: true }).limit(30)).data ?? [],
  });
  const chart = (logs as any[]).map(r => ({ date: format(new Date(r.log_date), "M/d"), sleep: r.sleep_hours, weight: r.weight_kg }));

  return (
    <WHLayout title="Period Tracking">
      <TopTabs tabs={PERIOD_TABS} />
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Avg Cycle</p><p className="font-bold text-lg">{profile?.avg_cycle_length ?? "—"} d</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Avg Period</p><p className="font-bold text-lg">{profile?.avg_period_length ?? "—"} d</p></Card>
      </div>
      <Card className="p-4 mb-3">
        <p className="font-semibold mb-2 text-sm">Sleep Trend (last 30 days)</p>
        {chart.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">No data yet. Log a few days to see your trends.</p>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chart}>
              <XAxis dataKey="date" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Line type="monotone" dataKey="sleep" stroke="hsl(var(--wh-purple))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
      <Card className="p-4 bg-wh-blue-soft border-0">
        <p className="text-sm flex items-start gap-2"><Sparkles className="h-4 w-4 text-wh-blue mt-0.5" /><span>Keep logging daily — your insights get smarter with every entry.</span></p>
      </Card>
    </WHLayout>
  );
};

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
    </WHLayout>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// PREGNANCY
const PREGNANCY_TABS = [
  { to: "/womens-health/pregnancy", label: "Overview", end: true },
  { to: "/womens-health/pregnancy/baby-growth", label: "Baby Growth" },
  { to: "/womens-health/pregnancy/calendar", label: "Calendar" },
  { to: "/womens-health/pregnancy/health", label: "Health" },
  { to: "/womens-health/pregnancy/insights", label: "Insights" },
];

const PregnancyOnboarding = () => {
  const { save } = usePregnancyProfile();
  const navigate = useNavigate();
  const [lmp, setLmp] = useState<string>("");
  const [useDue, setUseDue] = useState(false);
  const [due, setDue] = useState<string>("");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <WHLayout title="Pregnancy Setup" showBack>
      <Card className="p-5 mb-4 border-0" style={{ background: "var(--gradient-wh-hero)" }}>
        <Baby className="h-8 w-8 text-wh-pink mb-2" />
        <h2 className="text-xl font-bold">Welcome to your pregnancy journey</h2>
        <p className="text-sm text-muted-foreground">Enter your dates so we can track baby growth week by week.</p>
      </Card>
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between"><Label>Use due date instead of LMP</Label><Switch checked={useDue} onCheckedChange={setUseDue} /></div>
        {!useDue ? (
          <div>
            <Label>First day of your last menstrual period</Label>
            <Input type="date" max={todayStr} value={lmp} onChange={e => setLmp(e.target.value)} />
          </div>
        ) : (
          <div>
            <Label>Your due date</Label>
            <Input type="date" value={due} onChange={e => setDue(e.target.value)} />
          </div>
        )}
        <Button
          className="w-full bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full"
          disabled={useDue ? !due : !lmp}
          onClick={async () => {
            if (useDue ? !due : !lmp) { toast({ title: "Pick a date", description: "Please enter the required date.", variant: "destructive" }); return; }
            await save(useDue ? { due_date: due, lmp_date: null } : { lmp_date: lmp, due_date: null });
            toast({ title: "Pregnancy started 🎉" });
            navigate("/womens-health/pregnancy");
          }}
        >Start Pregnancy Journey</Button>
      </Card>
    </WHLayout>
  );
};

const PregnancyOverview = () => {
  const { profile: preg, loading } = usePregnancyProfile();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  if (loading) return <WHLayout title="Pregnancy"><Card className="h-48 animate-pulse" /></WHLayout>;
  if (!preg?.lmp_date && !preg?.due_date) return <Navigate to="/womens-health/pregnancy/onboarding" replace />;
  const state = computePregnancy({ lmpDate: preg!.lmp_date, dueDate: preg!.due_date });
  if (!state) return <Navigate to="/womens-health/pregnancy/onboarding" replace />;

  const first = (userProfile as any)?.first_name || "there";
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
  })();

  return (
    <WHLayout title="Pregnancy">
      <TopTabs tabs={PREGNANCY_TABS} />

      {/* Hero */}
      <Card className="p-5 mb-4 border-0 shadow-[var(--shadow-wh-card)] relative overflow-hidden" style={{ background: "var(--gradient-wh-hero)" }}>
        <button className="absolute top-3 right-3 h-9 w-9 rounded-full bg-card grid place-items-center shadow"><Share2 className="h-4 w-4 text-foreground/70" /></button>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{greeting}, {first} 🌸</p>
            <p className="text-[36px] font-extrabold text-wh-pink leading-none mt-2">Week {state.week}</p>
            <p className="text-wh-pink font-semibold">{trimesterLabel(state.trimester)}</p>
            <p className="text-sm text-foreground/75 mt-1">{state.weeksRemaining} Weeks to go!</p>
            <div className="flex gap-2 mt-3 text-xs">
              <div className="bg-card rounded-xl p-2 px-3 flex items-center gap-2 shadow-sm">
                <div className="h-7 w-7 rounded-lg bg-wh-pink-soft grid place-items-center"><CalIcon className="h-4 w-4 text-wh-pink" /></div>
                <div><p className="text-[10px] text-muted-foreground leading-none">Due Date</p><p className="font-bold text-[11px] mt-0.5">{format(state.dueDate, "d MMM yyyy")}</p></div>
              </div>
              <div className="bg-card rounded-xl p-2 px-3 flex items-center gap-2 shadow-sm">
                <div className="h-7 w-7 rounded-lg bg-wh-pink-soft grid place-items-center"><Activity className="h-4 w-4 text-wh-pink" /></div>
                <div><p className="text-[10px] text-muted-foreground leading-none">Days Remaining</p><p className="font-bold text-[11px] mt-0.5">{state.daysRemaining} Days</p></div>
              </div>
            </div>
            <div className="mt-3">
              <Progress value={state.progressPct} className="h-2 bg-card" />
              <div className="flex justify-between text-[11px] text-foreground/70 mt-1">
                <span>{state.week} of 40 Weeks</span>
                <span className="font-semibold">{state.progressPct}%</span>
              </div>
            </div>
          </div>
          <div className="h-[120px] w-[120px] rounded-full bg-card grid place-items-center text-6xl shadow-inner flex-shrink-0">👶</div>
        </div>
      </Card>

      {/* Baby size + development */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <BabySizeCard week={state.week} />
        <BabyDevelopmentCard week={state.week} onView={() => navigate("/womens-health/pregnancy/baby-growth")} />
      </div>

      {/* Today's Highlights */}
      <TodaysHighlights week={state.week} />

      {/* Health Log Summary */}
      <HealthLogSummary />

      {/* Upcoming Appointments */}
      <UpcomingAppointments />
    </WHLayout>
  );
};

const BabySizeCard = ({ week }: { week: number }) => {
  const { data } = useQuery({
    queryKey: ["baby-growth", week],
    queryFn: async () => (await (supabase as any).from("baby_growth_data").select("*").eq("week", week).maybeSingle()).data,
  });
  return (
    <Card className="p-4 border-0" style={{ background: "linear-gradient(135deg, hsl(var(--wh-purple)/.12), hsl(var(--wh-pink)/.05))" }}>
      <p className="text-xs text-foreground/70">Your Baby is the size of a</p>
      {data ? (
        <>
          <p className="text-xl font-extrabold text-wh-purple mt-0.5 leading-tight">{data.size_comparison} <span className="text-xl">{data.size_emoji ?? "🌱"}</span></p>
          <div className="flex gap-3 mt-2 text-[11px]">
            <div><p className="text-muted-foreground leading-none">Length</p><p className="font-bold text-xs mt-0.5">{data.length_cm ?? "—"} cm</p></div>
            <div><p className="text-muted-foreground leading-none">Weight</p><p className="font-bold text-xs mt-0.5">{data.weight_g ?? "—"} g</p></div>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground mt-2">Tracking week {week}…</p>
      )}
      <div className="flex justify-end mt-2"><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
    </Card>
  );
};

const BabyDevelopmentCard = ({ week, onView }: { week: number; onView: () => void }) => {
  const { data } = useQuery({
    queryKey: ["baby-growth", week],
    queryFn: async () => (await (supabase as any).from("baby_growth_data").select("*").eq("week", week).maybeSingle()).data,
  });
  return (
    <Card className="p-4">
      <p className="font-bold text-sm">Baby's Development</p>
      <p className="text-xs text-foreground/75 mt-1 line-clamp-3">{data?.development ?? "Loading development info for this week…"}</p>
      <button onClick={onView} className="text-wh-pink text-xs font-semibold underline mt-2 flex items-center gap-1">View Details <ChevronRight className="h-3 w-3" /></button>
    </Card>
  );
};

const TodaysHighlights = ({ week }: { week: number }) => {
  const { data } = useQuery({
    queryKey: ["baby-growth", week],
    queryFn: async () => (await (supabase as any).from("baby_growth_data").select("*").eq("week", week).maybeSingle()).data,
  });
  const items = [
    { Icon: Heart, label: "Your Body", text: data?.milestones?.[0] ?? "Track changes you're feeling today.", bg: "bg-wh-pink-soft", color: "text-wh-pink" },
    { Icon: Baby, label: "Baby's Growth", text: data?.development ? data.development.split(".")[0] + "." : "See how baby is growing this week.", bg: "bg-wh-purple-soft", color: "text-wh-purple" },
    { Icon: Apple, label: "Health Tip", text: "Eat iron rich foods and stay hydrated.", bg: "bg-wh-green-soft", color: "text-wh-green" },
    { Icon: CheckSquare, label: "To Do Today", text: "Prenatal vitamin · water · rest.", bg: "bg-wh-blue-soft", color: "text-wh-blue" },
  ];
  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold">Today's Highlights</p>
        <Link to="/womens-health/pregnancy/health" className="text-xs text-wh-pink font-semibold">View All</Link>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {items.map(i => (
          <div key={i.label} className="text-center">
            <div className={`h-12 w-12 mx-auto rounded-full grid place-items-center ${i.bg} mb-2`}><i.Icon className={`h-6 w-6 ${i.color}`} /></div>
            <p className="text-[11px] font-semibold">{i.label}</p>
            <p className="text-[10px] text-muted-foreground line-clamp-3 leading-tight mt-1">{i.text}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

const HealthLogSummary = () => {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: dhl } = useQuery({
    queryKey: ["wh-dhl-preg", user?.id, today],
    enabled: !!user,
    queryFn: async () => (await (supabase as any).from("daily_health_logs").select("*").eq("user_id", user!.id).eq("log_date", today).maybeSingle()).data,
  });
  const stats = [
    { Icon: Activity, label: "Weight", val: dhl?.weight_kg ? `${dhl.weight_kg} kg` : "—", sub: dhl?.weight_kg ? "Logged" : "Not set", color: "text-wh-pink" },
    { Icon: Droplet, label: "Water", val: dhl?.water_glasses != null ? `${dhl.water_glasses} / 8` : "—", sub: dhl?.water_glasses >= 6 ? "Good" : "Keep going", color: "text-wh-blue" },
    { Icon: Moon, label: "Sleep", val: dhl?.sleep_hours ? `${dhl.sleep_hours}h` : "—", sub: dhl?.sleep_hours >= 7 ? "Good" : "Rest more", color: "text-wh-purple" },
    { Icon: Zap, label: "Activity", val: dhl?.exercise_minutes != null ? `${dhl.exercise_minutes} min` : "—", sub: dhl?.exercise_minutes ? "Logged" : "—", color: "text-wh-green" },
    { Icon: Smile, label: "Mood", val: dhl?.mood ?? "—", sub: dhl?.mood ? "Logged" : "—", color: "text-wh-orange" },
  ];
  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold">Health Log Summary</p>
        <Link to="/womens-health/logs" className="text-xs text-wh-pink font-semibold">Log Now</Link>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {stats.map(s => (
          <div key={s.label} className="text-center">
            <s.Icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
            <p className="text-xs font-bold leading-tight">{s.val}</p>
            <p className={`text-[9px] ${s.color}`}>{s.sub}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

const UpcomingAppointments = () => {
  const { user } = useAuth();
  const { data: appts = [] } = useQuery({
    queryKey: ["upcoming-appts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("appointments")
        .select("id, scheduled_date, scheduled_time, appointment_type, reason, status")
        .eq("patient_id", user!.id)
        .gte("scheduled_date", today)
        .in("status", ["confirmed", "pending", "scheduled"])
        .order("scheduled_date", { ascending: true })
        .limit(3);
      return data ?? [];
    },
  });

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold">Upcoming Appointments</p>
        <Link to="/appointments" className="text-xs text-wh-pink font-semibold">View All</Link>
      </div>
      {appts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">No upcoming appointments.</p>
      ) : (
        <div className="space-y-2">
          {appts.map((a: any) => {
            const d = a.scheduled_date ? new Date(a.scheduled_date) : null;
            const daysLeft = d ? Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000)) : 0;
            return (
              <div key={a.id} className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-wh-pink-soft text-wh-pink grid place-items-center text-center">
                  <div>
                    <p className="text-[9px] font-bold uppercase leading-none">{d ? format(d, "MMM") : ""}</p>
                    <p className="text-base font-extrabold leading-none mt-0.5">{d ? format(d, "d") : "—"}</p>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{a.reason || (a.appointment_type === "home_visit" ? "Home Visit" : "Checkup")}</p>
                  <p className="text-xs text-muted-foreground">{d ? format(d, "EEEE") : ""}{a.scheduled_time ? `, ${a.scheduled_time}` : ""}</p>
                </div>
                <div className="flex items-center gap-1 text-wh-pink text-xs font-semibold"><Bell className="h-3.5 w-3.5" />{daysLeft} {daysLeft === 1 ? "Day" : "Days"} Left<ChevronRight className="h-4 w-4 text-muted-foreground ml-1" /></div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

// Baby Growth full timeline
const BabyGrowthTimeline = () => {
  const { profile: preg } = usePregnancyProfile();
  const state = preg ? computePregnancy({ lmpDate: preg.lmp_date, dueDate: preg.due_date }) : null;
  const { data: all = [] } = useQuery({
    queryKey: ["baby-growth-all"],
    queryFn: async () => (await (supabase as any).from("baby_growth_data").select("*").order("week")).data ?? [],
  });
  return (
    <WHLayout title="Pregnancy" showBack>
      <TopTabs tabs={PREGNANCY_TABS} />
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

// Pregnancy calendar / health / insights tabs (minimal)
const PregnancyCalendar = () => (
  <WHLayout title="Pregnancy"><TopTabs tabs={PREGNANCY_TABS} /><MiniCalendar /></WHLayout>
);
const PregnancyHealth = () => (
  <WHLayout title="Pregnancy">
    <TopTabs tabs={PREGNANCY_TABS} />
    <HealthLogSummary />
    <UpcomingAppointments />
  </WHLayout>
);
const PregnancyInsights = () => (
  <WHLayout title="Pregnancy">
    <TopTabs tabs={PREGNANCY_TABS} />
    <Card className="p-4 bg-wh-pink-soft border-0">
      <p className="text-sm flex items-start gap-2"><Sparkles className="h-4 w-4 text-wh-pink mt-0.5" /><span>Your insights will appear here as you log your daily health.</span></p>
    </Card>
  </WHLayout>
);

// Fertility tabs share content
const FertilityCalendar = () => <WHLayout title="Fertility Tracker" showBack><TopTabs tabs={FERTILITY_TABS} /><MiniCalendar /></WHLayout>;
const FertilityOvulation = () => <FertilityToday />;
const FertilityInsights = () => (
  <WHLayout title="Fertility Tracker" showBack>
    <TopTabs tabs={FERTILITY_TABS} />
    <Card className="p-4 bg-wh-pink-soft border-0">
      <p className="text-sm flex items-start gap-2"><Sparkles className="h-4 w-4 text-wh-pink mt-0.5" /><span>Log symptoms regularly to unlock deeper fertility insights.</span></p>
    </Card>
  </WHLayout>
);

// ────────────────────────────────────────────────────────────────────────────
// ENTRY — 3-option chooser
const WHEntry = () => {
  const navigate = useNavigate();
  const tiles = [
    { label: "Cycle Tracking", desc: "Period, ovulation & fertile window", Icon: Flower2, to: "/womens-health/home", grad: "linear-gradient(135deg, hsl(var(--wh-pink)/.18), hsl(var(--wh-pink)/.05))", color: "wh-pink" },
    { label: "Pregnancy", desc: "Week-by-week journey & milestones", Icon: Heart, to: "/womens-health/pregnancy", grad: "linear-gradient(135deg, hsl(var(--wh-purple)/.18), hsl(var(--wh-purple)/.05))", color: "wh-purple" },
    { label: "Baby Growth", desc: "Size, development & timeline", Icon: Baby, to: "/womens-health/pregnancy/baby-growth", grad: "linear-gradient(135deg, hsl(var(--wh-blue)/.18), hsl(var(--wh-blue)/.05))", color: "wh-blue" },
    { label: "Insights", desc: "Your personal cycle patterns", Icon: Sparkles, to: "/womens-health/insights", grad: "linear-gradient(135deg, hsl(var(--wh-pink)/.18), hsl(var(--wh-pink)/.05))", color: "wh-pink" },
    { label: "Secret Chats", desc: "Private PIN-locked chat with Gift", Icon: Zap, to: "/womens-health/secret-chats", grad: "linear-gradient(135deg, hsl(var(--wh-purple)/.18), hsl(var(--wh-purple)/.05))", color: "wh-purple" },
  ];
  return (
    <WHLayout title="Women's Health">
      <p className="text-sm text-muted-foreground mb-4">Choose where you want to begin.</p>
      <div className="space-y-3">
        {tiles.map((t, i) => (
          <motion.div key={t.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.35 }}>
            <Card onClick={() => navigate(t.to)} className="p-5 cursor-pointer border-0 shadow-[var(--shadow-wh-card)] active:scale-[0.99] transition-transform" style={{ background: t.grad }}>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-card grid place-items-center shadow-[var(--shadow-wh-soft)]"><t.Icon className={`h-7 w-7 text-[hsl(var(--${t.color}))]`} /></div>
                <div className="flex-1"><p className="font-bold text-base">{t.label}</p><p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p></div>
                <ChevronRight className={`h-5 w-5 text-[hsl(var(--${t.color}))]`} />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </WHLayout>
  );
};

// Router
const WomensHealth = () => (
  <Routes>
    <Route index element={<WHEntry />} />
    <Route path="home" element={<PeriodOverview />} />
    <Route path="home/calendar" element={<PeriodCalendarPage />} />
    <Route path="home/insights" element={<PeriodInsights />} />
    <Route path="home/history" element={<PeriodHistory />} />

    <Route path="calendar" element={<PeriodCalendarPage />} />
    <Route path="insights" element={<PeriodInsights />} />
    <Route path="logs" element={<DailyLogPage />} />
    <Route path="profile" element={<WHProfile />} />
    <Route path="log-period" element={<LogPeriod />} />
    <Route path="secret-chats" element={<SecretChats />} />

    <Route path="fertility" element={<FertilityToday />} />
    <Route path="fertility/calendar" element={<FertilityCalendar />} />
    <Route path="fertility/ovulation" element={<FertilityOvulation />} />
    <Route path="fertility/insights" element={<FertilityInsights />} />

    <Route path="pregnancy" element={<PregnancyOverview />} />
    <Route path="pregnancy/onboarding" element={<PregnancyOnboarding />} />
    <Route path="pregnancy/baby-growth" element={<BabyGrowthTimeline />} />
    <Route path="pregnancy/calendar" element={<PregnancyCalendar />} />
    <Route path="pregnancy/health" element={<PregnancyHealth />} />
    <Route path="pregnancy/insights" element={<PregnancyInsights />} />
  </Routes>
);

export default WomensHealth;
