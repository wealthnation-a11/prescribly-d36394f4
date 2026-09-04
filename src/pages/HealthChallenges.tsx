import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Droplets, Footprints, Pill, Brain, Pencil, Play, Plus, Flame, ChevronLeft, Check, Loader2, Square, Activity } from "lucide-react";
import MotionSensor from "@/components/MotionSensor";
import { usePageSEO } from "@/hooks/usePageSEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { buildHydrationSchedule } from "@/lib/wellnessAlarm";
import { awardPoints, loadWellnessProgress, type WellnessProgress } from "@/lib/wellnessPoints";

/* ───────────────────────── design tokens ───────────────────────── */
const BG = "#080C12";
const SURFACE = "#111827";
const BORDER = "rgba(255,255,255,0.07)";
const MUTED = "rgba(255,255,255,0.55)";

const FEATURES = {
  sleep:      { key: "sleep",      label: "Sleep",      color: "#7F77DD", Icon: Moon },
  water:      { key: "water",      label: "Water",      color: "#1D9E75", Icon: Droplets },
  steps:      { key: "steps",      label: "Steps",      color: "#EF9F27", Icon: Footprints },
  medication: { key: "medication", label: "Medication", color: "#D4537E", Icon: Pill },
  meditation: { key: "meditation", label: "Meditation", color: "#378ADD", Icon: Brain },
} as const;
type FeatureKey = keyof typeof FEATURES;
const ORDER: FeatureKey[] = ["sleep", "water", "steps", "medication", "meditation"];

/* ───────────────────────── helpers ───────────────────────── */
const todayISO = () => new Date().toISOString().slice(0, 10);
const dateNDaysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
};
const last7Dates = () => {
  const arr: string[] = [];
  for (let i = 6; i >= 0; i--) arr.push(dateNDaysAgo(i));
  return arr;
};
const DOW = ["S","M","T","W","T","F","S"];

/* ───────────────────────── reusable bits ───────────────────────── */
const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`text-[11px] uppercase tracking-[0.2em] font-medium ${className}`} style={{ color: MUTED }}>
    {children}
  </div>
);

const Surface: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", style, ...rest }) => (
  <div {...rest} className={`rounded-[20px] ${className}`} style={{ background: SURFACE, border: `0.5px solid ${BORDER}`, ...style }}>
    {children}
  </div>
);

const Ring: React.FC<{ size: number; stroke: number; value: number; max?: number; color: string; track?: string; delay?: number }> = ({
  size, stroke, value, max = 100, color, track = "rgba(255,255,255,0.08)", delay = 0,
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [draw, setDraw] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDraw(Math.min(1, Math.max(0, value / max))), 30 + delay);
    return () => clearTimeout(t);
  }, [value, max, delay]);
  return (
    <svg width={size} height={size} className="block">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${c} ${c}`} strokeDashoffset={c - c * draw}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 1s ease-out" }} />
    </svg>
  );
};

const SegmentRing: React.FC<{ size: number; stroke: number; segments: { color: string; value: number }[] }> = ({ size, stroke, segments }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const seg = c / segments.length;
  const gap = 6;
  const [mount, setMount] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMount(true), 30); return () => clearTimeout(t); }, []);
  return (
    <svg width={size} height={size}>
      {segments.map((s, i) => {
        const fill = (s.value / 100) * (seg - gap);
        const offset = -i * seg;
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${mount ? fill : 0} ${c}`} strokeDashoffset={offset}
            transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: "stroke-dasharray 1s ease-out" }} />
        );
      })}
    </svg>
  );
};

const LineChart: React.FC<{ values: number[]; color: string; height?: number }> = ({ values, color, height = 90 }) => {
  const w = 320, h = height, pad = 8;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1);
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map((p, i) => {
    if (i === 0) return `M${p[0]},${p[1]}`;
    const prev = pts[i - 1];
    const cx = (prev[0] + p[0]) / 2;
    return `Q${cx},${prev[1]} ${cx},${(prev[1] + p[1]) / 2} T${p[0]},${p[1]}`;
  }).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={4} fill={color} />
      <circle cx={last[0]} cy={last[1]} r={9} fill={color} opacity={0.18} />
    </svg>
  );
};

const EmptyState: React.FC<{ feature: FeatureKey; title: string; subtitle: string; ctaLabel: string; onCta: () => void; loading?: boolean }> = ({
  feature, title, subtitle, ctaLabel, onCta, loading,
}) => {
  const f = FEATURES[feature];
  return (
    <Surface className="p-8 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: `${f.color}1a`, border: `1px solid ${f.color}55` }}>
        <f.Icon className="w-9 h-9" style={{ color: f.color }} />
      </div>
      <div className="text-white text-[17px] font-medium">{title}</div>
      <div className="text-[13px] mt-1.5 max-w-[280px]" style={{ color: MUTED }}>{subtitle}</div>
      <button type="button" onClick={onCta} disabled={loading}
        className="mt-5 h-12 px-6 rounded-full text-white text-[14px] font-medium flex items-center gap-2 disabled:opacity-60"
        style={{ background: f.color }}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {ctaLabel}
      </button>
    </Surface>
  );
};

const SectionLoading = () => (
  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: MUTED }} /></div>
);

/* ───────────────────────── SLEEP ───────────────────────── */
type SleepRow = {
  date: string;
  hours_slept: number | null;
  quality: string | null;
  bedtime: string | null;
  wake_time: string | null;
  awakenings: number | null;
  dream_type: string | null;
  mood_on_wake: string | null;
  restfulness: number | null;
  late_caffeine: boolean | null;
  screens_before_bed: boolean | null;
  notes: string | null;
};
type SleepSchedule = { bedtime: string; wake: string };
const SLEEP_SCHED_KEY = (uid: string) => `sleep_schedule_${uid}`;

const fmt12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${(m || 0).toString().padStart(2, "0")} ${period}`;
};

const hoursBetween = (bed: string, wake: string) => {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
};

const DREAMS = [
  { k: "none", l: "No dreams" },
  { k: "good", l: "Good dreams" },
  { k: "vivid", l: "Vivid" },
  { k: "bad", l: "Bad dreams" },
];
const MOODS = [
  { k: "refreshed", l: "Refreshed" },
  { k: "okay", l: "Okay" },
  { k: "groggy", l: "Groggy" },
  { k: "exhausted", l: "Exhausted" },
];

/** Whole-routine sleep score: duration + restfulness + awakenings + dream/habit penalties. */
const sleepScoreOf = (r: Partial<SleepRow>) => {
  const h = Number(r.hours_slept ?? 0);
  if (!h) return 0;
  const duration = Math.max(0, 100 - Math.abs(8 - h) * 14); // 8h ideal
  const rest = r.restfulness ? (r.restfulness / 5) * 100 : duration;
  let score = duration * 0.55 + rest * 0.45;
  score -= Math.min(20, (r.awakenings ?? 0) * 5);
  if (r.dream_type === "bad") score -= 8;
  if (r.late_caffeine) score -= 4;
  if (r.screens_before_bed) score -= 3;
  return Math.max(0, Math.min(100, Math.round(score)));
};

const sleepVerdict = (score: number, r: Partial<SleepRow>) => {
  const bits: string[] = [];
  const h = Number(r.hours_slept ?? 0);
  if (h < 6) bits.push("you slept under 6 hours");
  else if (h > 9.5) bits.push("you overslept");
  if ((r.awakenings ?? 0) >= 3) bits.push(`you woke up ${r.awakenings} times`);
  if (r.dream_type === "bad") bits.push("bad dreams disturbed you");
  if (r.late_caffeine) bits.push("late caffeine may have delayed sleep");
  if (r.screens_before_bed) bits.push("screens before bed reduce deep sleep");
  const headline =
    score >= 80 ? "Great night" : score >= 60 ? "Decent night" : score >= 40 ? "Rough night" : "Bad night";
  const detail = bits.length
    ? `Because ${bits.join(", ")}.`
    : "Consistent timing and few interruptions — keep this routine.";
  return { headline, detail };
};

const SleepSection: React.FC<{ userId: string; onChange: () => void }> = ({ userId, onChange }) => {
  const color = FEATURES.sleep.color;
  const [loading, setLoading] = useState(true);
  const [todayRow, setTodayRow] = useState<SleepRow | null>(null);
  const [trend, setTrend] = useState<SleepRow[]>([]);
  const [sched, setSched] = useState<SleepSchedule>(() => {
    try {
      const raw = localStorage.getItem(SLEEP_SCHED_KEY(userId));
      if (raw) return JSON.parse(raw);
    } catch {}
    return { bedtime: "22:30", wake: "06:30" };
  });
  const [editing, setEditing] = useState<null | "bedtime" | "wake">(null);
  const [logOpen, setLogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bedtime: sched.bedtime,
    wake: sched.wake,
    awakenings: 0,
    dream_type: "none",
    mood_on_wake: "okay",
    restfulness: 3,
    late_caffeine: false,
    screens_before_bed: false,
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("user_sleep_log")
      .select("date, hours_slept, quality, bedtime, wake_time, awakenings, dream_type, mood_on_wake, restfulness, late_caffeine, screens_before_bed, notes")
      .eq("user_id", userId).gte("date", dateNDaysAgo(6)).order("date");
    const map = new Map<string, SleepRow>();
    ((rows ?? []) as any[]).forEach((r) => map.set(r.date, r as SleepRow));
    setTrend(last7Dates().map(d => map.get(d) ?? ({ date: d, hours_slept: 0 } as SleepRow)));
    setTodayRow(map.get(todayISO()) ?? null);
    setLoading(false);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const saveSchedule = (patch: Partial<SleepSchedule>) => {
    const next = { ...sched, ...patch };
    setSched(next);
    setForm(f => ({ ...f, bedtime: next.bedtime, wake: next.wake }));
    localStorage.setItem(SLEEP_SCHED_KEY(userId), JSON.stringify(next));
    toast({ title: "Schedule saved", description: `Bedtime ${fmt12(next.bedtime)} · Wake ${fmt12(next.wake)}` });
    setEditing(null);
  };

  const formHours = hoursBetween(form.bedtime, form.wake);

  const logSleep = async () => {
    setSaving(true);
    const payload = {
      user_id: userId,
      date: todayISO(),
      hours_slept: formHours,
      bedtime: form.bedtime,
      wake_time: form.wake,
      awakenings: form.awakenings,
      dream_type: form.dream_type,
      mood_on_wake: form.mood_on_wake,
      restfulness: form.restfulness,
      late_caffeine: form.late_caffeine,
      screens_before_bed: form.screens_before_bed,
      notes: form.notes || null,
    };
    const score = sleepScoreOf(payload as any);
    const { error } = await supabase.from("user_sleep_log").upsert(
      { ...payload, quality: score >= 80 ? "great" : score >= 60 ? "good" : score >= 40 ? "poor" : "bad" } as any,
      { onConflict: "user_id,date" }
    );
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    const v = sleepVerdict(score, payload as any);
    await awardPoints("sleep_logged", 1);
    toast({ title: `${v.headline} · ${score}/100`, description: v.detail });
    setLogOpen(false);
    await load(); onChange();
  };


  if (loading) return <SectionLoading />;

  const anyData = !!todayRow || trend.some(t => Number(t.hours_slept ?? 0) > 0);
  if (!anyData) {
    return (
      <EmptyState feature="sleep"
        title="Start your sleep journey"
        subtitle="Log last night — bedtime, wake up, interruptions and dreams — to see your sleep score and insights."
        ctaLabel="Set up Sleep" onCta={() => setLogOpen(true)} />
    );
  }

  const hrs = Number(todayRow?.hours_slept ?? 0);
  const score = sleepScoreOf(todayRow ?? {});
  const verdict = sleepVerdict(score, todayRow ?? {});
  const avg = trend.length ? Math.round((trend.reduce((a, b) => a + Number(b.hours_slept ?? 0), 0) / trend.length) * 10) / 10 : 0;
  const badNights = trend.filter(t => Number(t.hours_slept ?? 0) > 0 && sleepScoreOf(t) < 60).length;
  const badDreams = trend.filter(t => t.dream_type === "bad").length;

  const chipRow = (
    items: { k: string; l: string }[],
    value: string,
    onPick: (k: string) => void,
  ) => (
    <div className="flex flex-wrap gap-2">
      {items.map(i => (
        <button key={i.k} type="button" onClick={() => onPick(i.k)}
          className="h-9 px-3.5 rounded-full text-[12px]"
          style={{
            color: value === i.k ? "#fff" : MUTED,
            background: value === i.k ? color : "rgba(255,255,255,0.05)",
            border: `1px solid ${value === i.k ? color : BORDER}`,
          }}>
          {i.l}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <Surface className="p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 40%, ${color}22, transparent 60%)` }} />
        <div className="relative">
          <div style={{ color, fontSize: 64, fontWeight: 300, lineHeight: 1 }}>{score}</div>
          <Label className="mt-2">Sleep score</Label>
          <div className="mt-4 flex items-center justify-center gap-2 text-[22px]" style={{ color: "white" }}>
            <Moon className="w-5 h-5" style={{ color }} /> {Math.floor(hrs)}h {Math.round((hrs % 1) * 60)}m
          </div>
          {todayRow && (
            <div className="mt-4 rounded-2xl p-3 text-left" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="text-white text-[13px] font-medium">{verdict.headline}</div>
              <div className="text-[12px] mt-0.5" style={{ color: MUTED }}>{verdict.detail}</div>
            </div>
          )}
        </div>
      </Surface>

      {todayRow && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { v: String(todayRow.awakenings ?? 0), l: "Wake-ups" },
            { v: DREAMS.find(d => d.k === todayRow.dream_type)?.l ?? "—", l: "Dreams" },
            { v: MOODS.find(m => m.k === todayRow.mood_on_wake)?.l ?? "—", l: "On waking" },
          ].map(s => (
            <Surface key={s.l} className="p-4 text-center">
              <div className="text-white text-[15px]">{s.v}</div>
              <Label className="mt-2">{s.l}</Label>
            </Surface>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {([{ k: "bedtime" as const, l: "Bedtime", v: sched.bedtime }, { k: "wake" as const, l: "Wake up", v: sched.wake }]).map(c => (
          <Surface key={c.l} className="p-4">
            <Label>{c.l}</Label>
            <div className="flex items-center justify-between mt-2">
              {editing === c.k ? (
                <input type="time" defaultValue={c.v} autoFocus
                  onBlur={(e) => saveSchedule({ [c.k]: e.target.value } as any)}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  className="bg-transparent text-white text-lg outline-none w-full" />
              ) : (
                <div className="text-white text-lg">{fmt12(c.v)}</div>
              )}
              <button type="button" onClick={() => setEditing(c.k)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                <Pencil className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>
          </Surface>
        ))}
      </div>

      <button type="button" onClick={() => setLogOpen(v => !v)} className="w-full h-[52px] rounded-[16px] text-white font-medium flex items-center justify-center gap-2" style={{ background: color }}>
        <Plus className="w-4 h-4" /> {todayRow ? "Update last night" : "Log last night"}
      </button>

      {logOpen && (
        <Surface className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Went to bed</Label>
              <input type="time" value={form.bedtime} onChange={e => setForm(f => ({ ...f, bedtime: e.target.value }))}
                className="w-full bg-transparent border-0 border-b text-white text-lg py-2 outline-none" style={{ borderColor: BORDER }} />
            </div>
            <div>
              <Label>Woke up</Label>
              <input type="time" value={form.wake} onChange={e => setForm(f => ({ ...f, wake: e.target.value }))}
                className="w-full bg-transparent border-0 border-b text-white text-lg py-2 outline-none" style={{ borderColor: BORDER }} />
            </div>
          </div>
          <div className="text-[12px]" style={{ color: MUTED }}>That's <span style={{ color }}>{formHours}h</span> of sleep.</div>

          <div className="space-y-2">
            <Label>Times you woke up</Label>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map(n => (
                <button key={n} type="button" onClick={() => setForm(f => ({ ...f, awakenings: n }))}
                  className="flex-1 h-10 rounded-xl text-[13px]"
                  style={{
                    color: form.awakenings === n ? "#fff" : MUTED,
                    background: form.awakenings === n ? color : "rgba(255,255,255,0.05)",
                  }}>
                  {n === 4 ? "4+" : n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dreams</Label>
            {chipRow(DREAMS, form.dream_type, k => setForm(f => ({ ...f, dream_type: k })))}
          </div>

          <div className="space-y-2">
            <Label>How you felt on waking</Label>
            {chipRow(MOODS, form.mood_on_wake, k => setForm(f => ({ ...f, mood_on_wake: k })))}
          </div>

          <div className="space-y-2">
            <Label>How rested (1–5)</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setForm(f => ({ ...f, restfulness: n }))}
                  className="flex-1 h-10 rounded-xl text-[13px]"
                  style={{
                    color: form.restfulness === n ? "#fff" : MUTED,
                    background: form.restfulness === n ? color : "rgba(255,255,255,0.05)",
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {[
              { k: "late_caffeine" as const, l: "Caffeine after 4pm" },
              { k: "screens_before_bed" as const, l: "Screens in the last hour" },
            ].map(t => (
              <button key={t.k} type="button" onClick={() => setForm(f => ({ ...f, [t.k]: !f[t.k] }))}
                className="w-full h-11 px-4 rounded-xl flex items-center justify-between text-[13px]"
                style={{ background: "rgba(255,255,255,0.05)", color: "white" }}>
                {t.l}
                <span className="w-5 h-5 rounded-md flex items-center justify-center"
                  style={{ background: form[t.k] ? color : "rgba(255,255,255,0.1)" }}>
                  {form[t.k] && <Check className="w-3.5 h-3.5 text-white" />}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Anything that affected your sleep…"
              className="w-full bg-transparent border rounded-xl text-white text-[13px] p-3 outline-none"
              style={{ borderColor: BORDER }} />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setLogOpen(false)} className="flex-1 h-11 rounded-xl text-white" style={{ background: "rgba(255,255,255,0.06)" }}>Cancel</button>
            <button type="button" onClick={logSleep} disabled={saving} className="flex-1 h-11 rounded-xl text-white font-medium flex items-center justify-center gap-2" style={{ background: color }}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save night
            </button>
          </div>
        </Surface>
      )}

      <Surface className="p-5">
        <div className="flex items-center justify-between mb-2">
          <Label>7-day trend</Label>
          <div className="text-[11px]" style={{ color: MUTED }}>Avg {avg}h</div>
        </div>
        <LineChart values={trend.map(t => Number(t.hours_slept ?? 0))} color={color} />
        <div className="flex justify-between text-[11px] mt-1" style={{ color: MUTED }}>
          {trend.map((t, i) => <span key={i}>{DOW[new Date(t.date).getDay()]}</span>)}
        </div>
        <div className="mt-4 text-[12px] leading-relaxed" style={{ color: MUTED }}>
          {badNights === 0
            ? "No bad nights this week — your routine is working."
            : `${badNights} bad night${badNights > 1 ? "s" : ""} this week${badDreams ? `, ${badDreams} with bad dreams` : ""}.`}
        </div>
      </Surface>
    </div>
  );
};


/* ───────────────────────── WATER ───────────────────────── */
type Slot = { id: string; slot_index: number; scheduled_at: string; ml: number; status: "pending"|"taken"|"missed"|"skipped"; taken_at: string|null };
const HYDRA_GOAL_KEY = (uid: string) => `hydration_goal_${uid}`;

const WaterSection: React.FC<{ userId: string; onChange: () => void }> = ({ userId, onChange }) => {
  const color = FEATURES.water.color;
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [week, setWeek] = useState<{ date: string; ml: number }[]>([]);
  const [goalL, setGoalL] = useState<number>(() => Number(localStorage.getItem(HYDRA_GOAL_KEY(userId)) ?? 2));
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: today }, { data: weekRows }] = await Promise.all([
      supabase.from("hydration_slots").select("id, slot_index, scheduled_at, ml, status, taken_at")
        .eq("user_id", userId).eq("log_date", todayISO()).order("slot_index"),
      supabase.from("hydration_slots").select("log_date, ml, status")
        .eq("user_id", userId).gte("log_date", dateNDaysAgo(6)),
    ]);
    setSlots((today ?? []) as Slot[]);
    const map = new Map<string, number>();
    (weekRows ?? []).forEach((r: any) => {
      if (r.status === "taken") map.set(r.log_date, (map.get(r.log_date) ?? 0) + r.ml);
    });
    setWeek(last7Dates().map(d => ({ date: d, ml: map.get(d) ?? 0 })));
    setLoading(false);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const seedToday = async () => {
    setSeeding(true);
    localStorage.setItem(HYDRA_GOAL_KEY(userId), String(goalL));
    const sched = buildHydrationSchedule(goalL);
    const rows = sched.slots.map(s => ({
      user_id: userId, log_date: todayISO(), slot_index: s.index,
      scheduled_at: s.time.toISOString(), ml: sched.mlPerGlass, status: "pending" as const,
    }));
    const { error } = await supabase.from("hydration_slots").insert(rows);
    setSeeding(false);
    if (error) { toast({ title: "Failed to create schedule", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Hydration schedule created", description: `${sched.glasses} reminders for today` });
    await load(); onChange();
  };

  const markTaken = async (slot: Slot) => {
    const { error } = await supabase.from("hydration_slots")
      .update({ status: "taken", taken_at: new Date().toISOString() })
      .eq("id", slot.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, status: "taken", taken_at: new Date().toISOString() } : s));
    await awardPoints("water_slot", 1);
    onChange();
  };

  const quickAdd = async (ml: number) => {
    // Mark next pending slots until ml budget is consumed
    let remaining = ml;
    const ordered = [...slots].filter(s => s.status === "pending").sort((a,b) => a.slot_index - b.slot_index);
    const toMark: Slot[] = [];
    for (const s of ordered) {
      if (remaining <= 0) break;
      toMark.push(s); remaining -= s.ml;
    }
    if (!toMark.length) { toast({ title: "All glasses already logged", description: "Great work — you're on track!" }); return; }
    const ids = toMark.map(s => s.id);
    const { error } = await supabase.from("hydration_slots")
      .update({ status: "taken", taken_at: new Date().toISOString() }).in("id", ids);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setSlots(prev => prev.map(s => ids.includes(s.id) ? { ...s, status: "taken", taken_at: new Date().toISOString() } : s));
    toast({ title: `+${ml}ml logged`, description: `${toMark.length} glass${toMark.length>1?"es":""} marked done` });
    onChange();
  };

  if (loading) return <SectionLoading />;

  if (!slots.length) {
    return (
      <div className="space-y-4">
        <EmptyState feature="water"
          title="Start your water journey"
          subtitle="Set a daily goal and we'll create a smart reminder schedule for today."
          ctaLabel={seeding ? "Setting up…" : `Set up Water (${goalL}L)`} onCta={seedToday} loading={seeding} />
        <div className="flex gap-2 justify-center flex-wrap">
          {[1, 1.5, 2, 2.5, 3].map(L => (
            <button key={L} type="button" onClick={() => setGoalL(L)}
              className="h-10 px-4 rounded-full text-[13px]"
              style={goalL === L
                ? { background: color, color: "white" }
                : { background: "rgba(255,255,255,0.04)", color: "white", border: `0.5px solid ${BORDER}` }}>
              {L}L
            </button>
          ))}
        </div>
      </div>
    );
  }

  const goalMl = goalL * 1000;
  const takenMl = slots.filter(s => s.status === "taken").reduce((a, s) => a + s.ml, 0);
  const liters = takenMl / 1000;
  const pct = Math.min(100, Math.round((takenMl / goalMl) * 100));
  const weekMax = Math.max(...week.map(w => w.ml), goalMl);

  return (
    <div className="space-y-5">
      <Surface className="p-6 flex flex-col items-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 50%, ${color}22, transparent 60%)` }} />
        <div className="relative w-[160px] h-[160px] rounded-full overflow-hidden" style={{ border: `1px solid ${color}55` }}>
          <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.03)" }} />
          <div className="absolute left-0 right-0 bottom-0"
            style={{ height: `${pct}%`, background: `linear-gradient(180deg, ${color}cc, ${color})`, transition: "height 1s ease-out" }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div style={{ fontSize: 48, fontWeight: 300, color: "white", lineHeight: 1 }}>{liters.toFixed(1)}L</div>
            <div className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>of {goalL.toFixed(1)}L goal</div>
          </div>
        </div>
        <div className="mt-4 text-[13px] font-medium" style={{ color }}>{pct}% hydrated</div>
      </Surface>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6">
        {[250, 500, 750, 1000].map(v => (
          <button key={v} type="button" onClick={() => quickAdd(v)}
            className="shrink-0 h-11 px-5 rounded-full text-[13px] font-medium whitespace-nowrap"
            style={{ color, border: `1px solid ${color}66`, background: `${color}10` }}>
            +{v >= 1000 ? "1L" : `${v}ml`}
          </button>
        ))}
      </div>

      <Surface className="p-5">
        <Label className="mb-3">Today's reminders</Label>
        <div className="space-y-3">
          {slots.map(s => {
            const time = new Date(s.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const done = s.status === "taken";
            const missed = s.status === "missed";
            return (
              <div key={s.id} className="flex items-center justify-between min-h-[44px]">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: done ? "#22c55e" : missed ? "#ef4444" : "rgba(255,255,255,0.25)" }} />
                  <div className="text-white text-[15px]">{time}</div>
                  <div className="text-[13px]" style={{ color: MUTED }}>Glass {s.slot_index} · {s.ml}ml</div>
                </div>
                {done ? (
                  <span className="text-[11px] flex items-center gap-1" style={{ color: "#22c55e" }}><Check className="w-3 h-3" /> Done</span>
                ) : (
                  <button type="button" onClick={() => markTaken(s)} className="h-8 px-3 rounded-full text-[12px] font-medium"
                    style={{ color, background: `${color}1a`, border: `1px solid ${color}55` }}>
                    Mark done
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Surface>

      <Surface className="p-5">
        <Label className="mb-3">7-day intake</Label>
        <div className="relative h-[120px] flex items-end gap-2">
          <div className="absolute left-0 right-0" style={{ bottom: `${(goalMl / weekMax) * 100}%`, borderTop: `1px dashed ${color}80` }} />
          {week.map((w, i) => (
            <div key={i} className="flex-1 rounded-md" style={{ height: `${Math.max(2, (w.ml / weekMax) * 100)}%`, background: i === 6 ? color : `${color}55` }} />
          ))}
        </div>
        <div className="flex justify-between text-[11px] mt-2" style={{ color: MUTED }}>
          {week.map((w, i) => <span key={i}>{DOW[new Date(w.date).getDay()]}</span>)}
        </div>
      </Surface>
    </div>
  );
};

/* ───────────────────────── STEPS ───────────────────────── */
const StepsSection: React.FC<{ userId: string; onChange: () => void }> = ({ userId, onChange }) => {
  const amber = FEATURES.steps.color;
  const coral = "#FF6E61";
  const green = "#22C55E";
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<{ step_count: number; goal: number } | null>(null);
  const [week, setWeek] = useState<{ date: string; steps: number }[]>([]);
  const [adding, setAdding] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [sessionSteps, setSessionSteps] = useState(0);
  const pending = useRef(0);
  const todayRef = useRef<{ step_count: number; goal: number } | null>(null);
  todayRef.current = today;

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("user_steps").select("date, step_count, goal")
      .eq("user_id", userId).gte("date", dateNDaysAgo(6)).order("date");
    const map = new Map<string, { steps: number; goal: number }>();
    (data ?? []).forEach((r: any) => map.set(r.date, { steps: r.step_count, goal: r.goal }));
    const t = map.get(todayISO());
    setToday(t ? { step_count: t.steps, goal: t.goal } : null);
    setWeek(last7Dates().map(d => ({ date: d, steps: map.get(d)?.steps ?? 0 })));
    setLoading(false);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const persist = useCallback(async (count: number, goal: number) => {
    const { error } = await supabase.from("user_steps").upsert(
      { user_id: userId, date: todayISO(), step_count: count, goal, goal_reached: count >= goal },
      { onConflict: "user_id,date" }
    );
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return false; }
    return true;
  }, [userId]);

  const setupSteps = async () => {
    setAdding(true);
    const ok = await persist(0, 10000);
    setAdding(false);
    if (!ok) return;
    toast({ title: "Steps tracking enabled", description: "Goal set to 10,000 steps" });
    await load(); onChange();
  };

  const addSteps = async (delta: number) => {
    const cur = todayRef.current;
    if (!cur || !delta) return;
    const next = Math.max(0, cur.step_count + delta);
    const ok = await persist(next, cur.goal);
    if (!ok) return;
    setToday({ ...cur, step_count: next });
    onChange();
  };

  /* live pedometer: buffer detected steps and flush to the database every 5s */
  useEffect(() => {
    if (!tracking) return;
    const id = window.setInterval(() => {
      const n = pending.current;
      if (n > 0) { pending.current = 0; void addSteps(n); }
    }, 5000);
    return () => {
      window.clearInterval(id);
      const n = pending.current;
      if (n > 0) { pending.current = 0; void addSteps(n); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking]);

  const toggleTracking = async () => {
    if (!tracking) {
      if (!todayRef.current) await setupSteps();
      setSessionSteps(0);
      pending.current = 0;
      setTracking(true);
      toast({ title: "Tracking started", description: "Keep your phone with you — steps save automatically." });
    } else {
      setTracking(false);
      toast({ title: "Tracking stopped", description: `${sessionSteps.toLocaleString()} steps this session` });
    }
  };

  if (loading) return <SectionLoading />;

  const hasAny = today || week.some(w => w.steps > 0);
  if (!hasAny) {
    return (
      <EmptyState feature="steps"
        title="Start your steps journey"
        subtitle="Track daily activity, calories burned and distance — set a goal to begin."
        ctaLabel={adding ? "Setting up…" : "Set up Steps"} onCta={setupSteps} loading={adding} />
    );
  }

  const steps = (today?.step_count ?? 0) + pending.current;
  const stepsGoal = today?.goal ?? 10000;
  const kcal = Math.round(steps * 0.04);
  const kcalGoal = Math.round(stepsGoal * 0.05);
  const km = Math.round((steps * 0.0008) * 10) / 10;
  const kmGoal = Math.round((stepsGoal * 0.0008) * 10) / 10;
  const weekMax = Math.max(...week.map(w => w.steps), stepsGoal);

  return (
    <div className="space-y-5">
      <MotionSensor
        isActive={tracking}
        onStepDetected={() => { pending.current += 1; setSessionSteps(s => s + 1); }}
      />

      <Surface className="p-6 flex flex-col items-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 45%, ${amber}22, transparent 60%)` }} />
        <div className="relative">
          <Ring size={200} stroke={14} value={(steps / stepsGoal) * 100} color={amber} />
          <div className="absolute inset-[18px]"><Ring size={164} stroke={14} value={(kcal / kcalGoal) * 100} color={coral} delay={150} /></div>
          <div className="absolute inset-[36px]"><Ring size={128} stroke={14} value={(km / kmGoal || 0) * 100} color={green} delay={300} /></div>
        </div>
        <div className="mt-4 text-center">
          <div style={{ fontSize: 36, fontWeight: 300, color: "white", lineHeight: 1 }}>{steps.toLocaleString()}</div>
          <Label className="mt-1">of {stepsGoal.toLocaleString()} steps</Label>
        </div>
      </Surface>

      <button type="button" onClick={toggleTracking}
        className="w-full h-[52px] rounded-[16px] font-medium flex items-center justify-center gap-2"
        style={{
          background: tracking ? "rgba(255,255,255,0.06)" : amber,
          color: tracking ? "white" : "#0B1220",
          border: tracking ? `1px solid ${amber}66` : "none",
        }}>
        {tracking ? <Square className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
        {tracking ? `Stop tracking · ${sessionSteps.toLocaleString()} steps` : "Start live tracking"}
      </button>
      {tracking && (
        <div className="text-center text-[12px]" style={{ color: MUTED }}>
          Counting your steps with the motion sensor — saving every few seconds.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { v: steps.toLocaleString(), l: "Steps", c: amber },
          { v: kcal,                   l: "Kcal",  c: coral },
          { v: `${km}km`,              l: "Dist",  c: green },
        ].map(s => (
          <Surface key={s.l} className="p-4 text-center">
            <div style={{ fontSize: 28, fontWeight: 300, color: s.c, lineHeight: 1 }}>{s.v}</div>
            <Label className="mt-2">{s.l}</Label>
          </Surface>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6">
        {[500, 1000, 2500, 5000].map(v => (
          <button key={v} type="button" onClick={() => addSteps(v)}
            className="shrink-0 h-11 px-5 rounded-full text-[13px] font-medium whitespace-nowrap"
            style={{ color: amber, border: `1px solid ${amber}66`, background: `${amber}10` }}>
            +{v.toLocaleString()}
          </button>
        ))}
      </div>

      <Surface className="p-5">
        <Label className="mb-3">This week</Label>
        <div className="flex items-end gap-2 h-[100px]">
          {week.map((w, i) => (
            <div key={i} className="flex-1 rounded-md" style={{ height: `${Math.max(2, (w.steps / weekMax) * 100)}%`, background: i === 6 ? amber : `${amber}40` }} />
          ))}
        </div>
        <div className="flex justify-between text-[11px] mt-2" style={{ color: MUTED }}>
          {week.map((w, i) => <span key={i}>{DOW[new Date(w.date).getDay()]}</span>)}
        </div>
      </Surface>
    </div>
  );
};


/* ───────────────────────── MEDICATION ───────────────────────── */
type Dose = { id: string; drug_name: string; dosage: string|null; scheduled_at: string; status: "pending"|"taken"|"missed"|"skipped" };

const MedicationSection: React.FC<{ userId: string; onChange: () => void }> = ({ userId, onChange }) => {
  const color = FEATURES.medication.color;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [adherence, setAdherence] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);
    const [{ data: today }, { data: month }] = await Promise.all([
      supabase.from("medication_doses").select("id, drug_name, dosage, scheduled_at, status")
        .eq("user_id", userId).gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString())
        .order("scheduled_at"),
      supabase.from("medication_doses").select("status")
        .eq("user_id", userId).gte("scheduled_at", new Date(Date.now() - 30*86400000).toISOString()),
    ]);
    setDoses((today ?? []) as Dose[]);
    const m = month ?? [];
    const total = m.filter((d: any) => d.status === "taken" || d.status === "missed").length;
    const taken = m.filter((d: any) => d.status === "taken").length;
    setAdherence(total > 0 ? Math.round((taken / total) * 100) : null);
    setLoading(false);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const markDose = async (d: Dose, status: "taken"|"missed") => {
    const { error } = await supabase.from("medication_doses")
      .update({ status, taken_at: status === "taken" ? new Date().toISOString() : null })
      .eq("id", d.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setDoses(prev => prev.map(x => x.id === d.id ? { ...x, status } : x));
    onChange();
  };

  if (loading) return <SectionLoading />;

  if (!doses.length && adherence === null) {
    return (
      <EmptyState feature="medication"
        title="Start your medication journey"
        subtitle="Add your prescriptions to schedule reminders and track adherence over time."
        ctaLabel="Set up Medication" onCta={() => navigate("/my-prescriptions")} />
    );
  }

  const chip = (s: string) => {
    if (s === "taken")  return { c: "#22c55e", bg: "rgba(34,197,94,0.12)", l: "Taken" };
    if (s === "missed") return { c: "#ef4444", bg: "rgba(239,68,68,0.12)", l: "Missed" };
    return { c: "rgba(255,255,255,0.6)", bg: "rgba(255,255,255,0.06)", l: "Upcoming" };
  };

  return (
    <div className="space-y-5">
      <Surface className="p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 40%, ${color}22, transparent 60%)` }} />
        <div className="relative">
          <div style={{ color, fontSize: 64, fontWeight: 300, lineHeight: 1 }}>{adherence ?? 0}</div>
          <Label className="mt-2">Adherence score</Label>
          <div className="text-[11px] mt-1" style={{ color: MUTED }}>Last 30 days</div>
        </div>
      </Surface>

      <Surface className="p-5">
        <Label className="mb-4">Today's schedule</Label>
        {doses.length === 0 ? (
          <div className="text-[13px] text-center py-6" style={{ color: MUTED }}>No doses scheduled for today.</div>
        ) : (
          <div className="relative pl-5">
            <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full" style={{ background: `${color}55` }} />
            <div className="space-y-4">
              {doses.map(d => {
                const c = chip(d.status);
                const time = new Date(d.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={d.id} className="flex items-center justify-between min-h-[44px] gap-3">
                    <div className="min-w-0">
                      <div className="text-white text-[16px] font-semibold truncate">{d.drug_name}</div>
                      <div className="text-[13px]" style={{ color: MUTED }}>{[d.dosage, time].filter(Boolean).join(" · ")}</div>
                    </div>
                    {d.status === "pending" ? (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => markDose(d, "taken")} className="h-8 px-3 rounded-full text-[12px] font-medium" style={{ color: "#22c55e", background: "rgba(34,197,94,0.12)" }}>Taken</button>
                        <button type="button" onClick={() => markDose(d, "missed")} className="h-8 px-3 rounded-full text-[12px] font-medium" style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)" }}>Miss</button>
                      </div>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[11px] font-medium" style={{ color: c.c, background: c.bg }}>{c.l}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Surface>

      <button type="button" onClick={() => navigate("/my-prescriptions")} className="w-full h-[52px] rounded-[16px] text-white font-medium flex items-center justify-center gap-2" style={{ background: FEATURES.water.color }}>
        <Plus className="w-4 h-4" /> Manage Medications
      </button>
    </div>
  );
};

/* ───────────────────────── MEDITATION ───────────────────────── */
const MeditationSection: React.FC<{ userId: string; onChange: () => void }> = ({ userId, onChange }) => {
  const color = FEATURES.meditation.color;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ sessions: 0, minutes: 0, streak: 0 });
  const [logging, setLogging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("meditation_sessions")
      .select("started_at, actual_minutes, completed")
      .eq("user_id", userId)
      .gte("started_at", new Date(Date.now() - 30*86400000).toISOString())
      .order("started_at", { ascending: false });
    const rows = (data ?? []).filter((r: any) => r.completed);
    const minutes = rows.reduce((a: number, r: any) => a + (r.actual_minutes ?? 0), 0);
    const days = new Set(rows.map((r: any) => new Date(r.started_at).toISOString().slice(0,10)));
    let streak = 0;
    const cursor = new Date();
    while (days.has(cursor.toISOString().slice(0,10))) { streak++; cursor.setDate(cursor.getDate() - 1); }
    setStats({ sessions: rows.length, minutes, streak });
    setLoading(false);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const logQuick = async (minutes: number, title: string) => {
    setLogging(true);
    const started = new Date(Date.now() - minutes * 60_000);
    const { error } = await supabase.from("meditation_sessions").insert({
      user_id: userId, started_at: started.toISOString(), ended_at: new Date().toISOString(),
      planned_minutes: minutes, actual_minutes: minutes, completed: true, sound_id: title,
      points_change: minutes,
    });
    setLogging(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${title} complete`, description: `${minutes} min logged` });
    await load(); onChange();
  };

  if (loading) return <SectionLoading />;

  if (stats.sessions === 0) {
    return (
      <EmptyState feature="meditation"
        title="Start your meditation journey"
        subtitle="Complete your first session to build a streak and track minutes meditated."
        ctaLabel={logging ? "Saving…" : "Start a 5-min session"}
        onCta={() => logQuick(5, "Morning Calm")} loading={logging} />
    );
  }

  const sessions = [
    { title: "Box Breathing",   dur: 4,  cat: "Breathing", c: color },
    { title: "Focus Reset",     dur: 10, cat: "Focus",     c: "#7F77DD" },
    { title: "Sleep Wind-down", dur: 12, cat: "Sleep",     c: "#534AB7" },
    { title: "Anxiety Relief",  dur: 8,  cat: "Anxiety",   c: "#1D9E75" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <span className="px-3 py-1.5 rounded-full text-[12px] font-medium text-white" style={{ background: "rgba(255,255,255,0.06)", border: `0.5px solid ${BORDER}` }}>
          <Flame className="w-3 h-3 inline mr-1 text-orange-400" /> {stats.streak} day streak
        </span>
      </div>

      <Surface className="relative overflow-hidden h-[160px] p-5 flex items-center" style={{ background: `linear-gradient(135deg, ${color}33 0%, #1a2540 60%, ${SURFACE} 100%)` }}>
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl" style={{ background: `${color}66` }} />
        <div className="absolute -left-8 bottom-0 w-40 h-40 rounded-full blur-3xl" style={{ background: "#534AB766" }} />
        <div className="relative flex-1">
          <div className="text-white" style={{ fontSize: 22, fontWeight: 500 }}>Morning Calm</div>
          <div className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>5 min · Breathing</div>
        </div>
        <button type="button" onClick={() => logQuick(5, "Morning Calm")} disabled={logging} className="relative w-14 h-14 rounded-full flex items-center justify-center disabled:opacity-60" style={{ background: "white" }}>
          <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: "white" }} />
          {logging ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : <Play className="w-5 h-5 text-black ml-0.5" fill="black" />}
        </button>
      </Surface>

      <div className="space-y-3">
        {sessions.map(s => (
          <Surface key={s.title} className="p-4 flex items-center gap-4" style={{ borderLeft: `3px solid ${s.c}` }}>
            <div className="flex-1">
              <div className="text-white text-[15px] font-medium">{s.title}</div>
              <div className="text-[12px] mt-0.5" style={{ color: MUTED }}>{s.dur} min · {s.cat}</div>
            </div>
            <button type="button" onClick={() => logQuick(s.dur, s.title)} disabled={logging}
              className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-60" style={{ background: `${s.c}22`, color: s.c }}>
              <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
            </button>
          </Surface>
        ))}
      </div>

      <div className="text-center text-[13px]" style={{ color: MUTED }}>
        {stats.sessions} session{stats.sessions === 1 ? "" : "s"} · {stats.minutes} mins meditated
      </div>
    </div>
  );
};

/* ───────────────────────── PAGE ───────────────────────── */

type Scores = Record<FeatureKey, number>;

const HealthChallenges: React.FC = () => {
  usePageSEO({
    title: "Health Challenges - Prescribly",
    description: "Sleep, water, steps, medication and meditation — all in one wellness hub.",
    canonicalPath: "/health-challenges",
  });
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [tab, setTab] = useState<FeatureKey>("sleep");
  const [scores, setScores] = useState<Scores>({ sleep: 0, water: 0, steps: 0, medication: 0, meditation: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);
  const firstName = useMemo(() => {
    const n = userProfile?.first_name || user?.user_metadata?.first_name || user?.email?.split("@")[0] || "there";
    return n.charAt(0).toUpperCase() + n.slice(1);
  }, [user, userProfile]);

  const loadScores = useCallback(async () => {
    if (!user) return;
    const uid = user.id;
    const start30 = new Date(Date.now() - 30*86400000).toISOString();
    const [sleep, hydra, steps, meds, meds30, medi] = await Promise.all([
      supabase.from("user_sleep_log").select("hours_slept").eq("user_id", uid).eq("date", todayISO()).maybeSingle(),
      supabase.from("hydration_slots").select("ml, status").eq("user_id", uid).eq("log_date", todayISO()),
      supabase.from("user_steps").select("step_count, goal").eq("user_id", uid).eq("date", todayISO()).maybeSingle(),
      supabase.from("medication_doses").select("status").eq("user_id", uid)
        .gte("scheduled_at", new Date(new Date().setHours(0,0,0,0)).toISOString())
        .lte("scheduled_at", new Date(new Date().setHours(23,59,59,999)).toISOString()),
      supabase.from("medication_doses").select("status").eq("user_id", uid).gte("scheduled_at", start30),
      supabase.from("meditation_sessions").select("actual_minutes, completed").eq("user_id", uid).gte("started_at", start30),
    ]);

    const sleepHrs = Number((sleep.data as any)?.hours_slept ?? 0);
    const sleepScore = Math.min(100, Math.round((sleepHrs / 8) * 100));

    const slots = (hydra.data ?? []) as any[];
    const takenMl = slots.filter(s => s.status === "taken").reduce((a, s) => a + s.ml, 0);
    const goalMl = slots.reduce((a, s) => a + s.ml, 0) || 2000;
    const waterScore = Math.min(100, Math.round((takenMl / goalMl) * 100));

    const st = (steps.data as any);
    const stepsScore = st ? Math.min(100, Math.round((st.step_count / Math.max(1, st.goal)) * 100)) : 0;

    const m30 = (meds30.data ?? []) as any[];
    const total = m30.filter(d => d.status === "taken" || d.status === "missed").length;
    const taken = m30.filter(d => d.status === "taken").length;
    const medScore = total > 0 ? Math.round((taken / total) * 100) : 0;

    const sessions = ((medi.data ?? []) as any[]).filter(s => s.completed);
    const minutes = sessions.reduce((a, s) => a + (s.actual_minutes ?? 0), 0);
    const medScoreMed = Math.min(100, Math.round((minutes / 150) * 100)); // 150 min/month target

    setScores({ sleep: sleepScore, water: waterScore, steps: stepsScore, medication: medScore, meditation: medScoreMed });
  }, [user]);

  useEffect(() => { loadScores(); }, [loadScores, refreshKey]);

  const overall = Math.round(ORDER.reduce((a, k) => a + scores[k], 0) / ORDER.length);
  const bump = useCallback(() => setRefreshKey(k => k + 1), []);

  const renderSection = () => {
    if (!user) return <SectionLoading />;
    switch (tab) {
      case "sleep":      return <SleepSection userId={user.id} onChange={bump} />;
      case "water":      return <WaterSection userId={user.id} onChange={bump} />;
      case "steps":      return <StepsSection userId={user.id} onChange={bump} />;
      case "medication": return <MedicationSection userId={user.id} onChange={bump} />;
      case "meditation": return <MeditationSection userId={user.id} onChange={bump} />;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: BG, color: "white", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes hcSlideIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
        .hc-anim { animation: hcSlideIn 300ms ease-out; }
      `}</style>

      <div className="max-w-[480px] mx-auto pb-24" style={{ paddingLeft: 24, paddingRight: 24 }}>
        <div className="pt-6 pb-2 flex items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center" style={{ color: MUTED }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Label>Wellness hub</Label>
          <div className="w-10" />
        </div>

        <div className="mt-2">
          <div className="text-[13px]" style={{ color: MUTED }}>{greeting}, {firstName}</div>
          <h1 className="mt-1" style={{ fontSize: 28, fontWeight: 500 }}>Health Challenges</h1>
        </div>

        <div className="mt-6 flex flex-col items-center relative">
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[180px] h-[180px] rounded-full" style={{ background: "radial-gradient(circle, rgba(127,119,221,0.18), transparent 70%)" }} />
          </div>
          <div className="relative">
            <SegmentRing size={140} stroke={10} segments={ORDER.map(k => ({ color: FEATURES[k].color, value: scores[k] }))} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div style={{ fontSize: 52, fontWeight: 300, lineHeight: 1 }}>{overall}</div>
              <Label className="mt-1">Today's score</Label>
            </div>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar w-full -mx-6 px-6 justify-between">
            {ORDER.map(k => {
              const f = FEATURES[k];
              const active = tab === k;
              return (
                <button key={k} type="button" onClick={() => setTab(k)} className="flex flex-col items-center gap-1 min-w-[56px]">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: active ? `${f.color}22` : "rgba(255,255,255,0.04)", border: `0.5px solid ${active ? f.color : BORDER}` }}>
                    <f.Icon className="w-4 h-4" style={{ color: f.color }} />
                  </span>
                  <span className="text-[10px]" style={{ color: active ? f.color : MUTED }}>{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="sticky top-0 z-10 -mx-6 px-6 py-3 mt-6" style={{ background: BG, borderBottom: `0.5px solid ${BORDER}` }}>
          <div className="flex gap-6 overflow-x-auto no-scrollbar">
            {ORDER.map(k => {
              const f = FEATURES[k];
              const active = tab === k;
              return (
                <button key={k} type="button" onClick={() => setTab(k)} className="relative shrink-0 pb-2 text-[13px] uppercase tracking-[0.15em] min-h-[44px] flex items-center"
                  style={{ color: active ? f.color : MUTED, fontWeight: active ? 500 : 400 }}>
                  {f.label}
                  {active && <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full" style={{ background: f.color }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div key={tab} className="hc-anim mt-5">
          {renderSection()}
        </div>
      </div>
    </div>
  );
};

export default HealthChallenges;
