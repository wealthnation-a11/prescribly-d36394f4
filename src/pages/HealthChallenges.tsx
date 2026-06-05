import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Droplets, Footprints, Pill, Brain, Pencil, Play, Plus, Flame, ChevronLeft } from "lucide-react";
import { usePageSEO } from "@/hooks/usePageSEO";
import { supabase } from "@/integrations/supabase/client";

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

/* ───────────────────────── reusable bits ───────────────────────── */
const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`text-[11px] uppercase tracking-[0.2em] font-medium ${className}`} style={{ color: MUTED }}>
    {children}
  </div>
);

const Surface: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", style, ...rest }) => (
  <div
    {...rest}
    className={`rounded-[20px] ${className}`}
    style={{ background: SURFACE, border: `0.5px solid ${BORDER}`, ...style }}
  >
    {children}
  </div>
);

/** SVG ring that animates from 0 to value on mount */
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
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${c} ${c}`} strokeDashoffset={c - c * draw}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1s ease-out" }}
      />
    </svg>
  );
};

/** Multicolor segmented overall ring */
const SegmentRing: React.FC<{ size: number; stroke: number; segments: { color: string; value: number }[] }> = ({
  size, stroke, segments,
}) => {
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
          <circle
            key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={s.color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${mount ? fill : 0} ${c}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: "stroke-dasharray 1s ease-out" }}
          />
        );
      })}
    </svg>
  );
};

/** Smooth line chart (monotone-ish) */
const LineChart: React.FC<{ values: number[]; color: string; height?: number }> = ({ values, color, height = 90 }) => {
  const w = 320, h = height, pad = 8;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (values.length - 1);
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

/* ───────────────────────── sections ───────────────────────── */

const SleepSection: React.FC = () => {
  const color = FEATURES.sleep.color;
  const score = 78;
  const trend = [62, 70, 65, 74, 80, 72, 78];
  const stages = [
    { label: "Awake", pct: 8,  c: "rgba(255,255,255,0.6)" },
    { label: "Light", pct: 55, c: "#AFA9EC" },
    { label: "Deep",  pct: 37, c: "#534AB7" },
  ];
  return (
    <div className="space-y-5">
      <Surface className="p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 40%, ${color}22, transparent 60%)` }} />
        <div className="relative">
          <div style={{ color, fontSize: 64, fontWeight: 300, lineHeight: 1 }}>{score}</div>
          <Label className="mt-2">Sleep score</Label>
          <div className="mt-4 flex items-center justify-center gap-2 text-[22px]" style={{ color: "white" }}>
            <Moon className="w-5 h-5" style={{ color }} /> 7h 23m
          </div>
        </div>
      </Surface>

      <Surface className="p-5">
        <Label className="mb-3">Sleep stages</Label>
        <div className="flex h-3 rounded-full overflow-hidden">
          {stages.map((s, i) => (
            <div key={i} style={{ width: `${s.pct}%`, background: s.c }} />
          ))}
        </div>
        <div className="flex justify-between text-[11px] mt-2" style={{ color: MUTED }}>
          <span>11 PM</span><span>1 AM</span><span>3 AM</span><span>5 AM</span><span>6 AM</span>
        </div>
        <div className="flex gap-3 mt-4">
          {stages.map(s => (
            <div key={s.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: MUTED }}>
              <span className="w-2 h-2 rounded-full" style={{ background: s.c }} /> {s.label}
            </div>
          ))}
        </div>
      </Surface>

      <div className="grid grid-cols-2 gap-3">
        {[{ l: "Bedtime", v: "10:30 PM" }, { l: "Wake up", v: "6:00 AM" }].map(c => (
          <Surface key={c.l} className="p-4">
            <Label>{c.l}</Label>
            <div className="flex items-center justify-between mt-2">
              <div className="text-white text-lg">{c.v}</div>
              <button type="button" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                <Pencil className="w-4 h-4" style={{ color: MUTED }} />
              </button>
            </div>
          </Surface>
        ))}
      </div>

      <div>
        <Label className="mb-3">Notes</Label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6">
          {["Stressed","Late caffeine","Medication","Exercise","Alcohol"].map(n => (
            <button key={n} type="button" className="shrink-0 px-4 h-11 rounded-full text-[13px] text-white whitespace-nowrap" style={{ background: "rgba(255,255,255,0.04)", border: `0.5px solid ${BORDER}` }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <Surface className="p-5">
        <div className="flex items-center justify-between mb-2">
          <Label>7-day trend</Label>
          <div className="text-[11px]" style={{ color: MUTED }}>Avg 71</div>
        </div>
        <LineChart values={trend} color={color} />
        <div className="flex justify-between text-[11px] mt-1" style={{ color: MUTED }}>
          {["M","T","W","T","F","S","S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
      </Surface>
    </div>
  );
};

const WaterSection: React.FC = () => {
  const color = FEATURES.water.color;
  const goal = 2.0;
  const [ml, setMl] = useState(1200);
  const liters = ml / 1000;
  const pct = Math.min(100, Math.round((ml / (goal * 1000)) * 100));
  const [fill, setFill] = useState(0);
  useEffect(() => { const t = setTimeout(() => setFill(pct), 50); return () => clearTimeout(t); }, [pct]);

  const reminders = [
    { time: "07:30", label: "Morning glass", done: true },
    { time: "10:00", label: "Mid-morning", done: true },
    { time: "13:00", label: "After lunch",  done: true },
    { time: "16:00", label: "Afternoon",    done: false },
    { time: "19:00", label: "Evening",      done: false },
  ];
  const week = [1.8, 2.1, 1.6, 2.0, 1.4, 1.9, liters];

  return (
    <div className="space-y-5">
      <Surface className="p-6 flex flex-col items-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 50%, ${color}22, transparent 60%)` }} />
        <div className="relative w-[160px] h-[160px] rounded-full overflow-hidden" style={{ border: `1px solid ${color}55` }}>
          <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.03)" }} />
          <div
            className="absolute left-0 right-0 bottom-0"
            style={{ height: `${fill}%`, background: `linear-gradient(180deg, ${color}cc, ${color})`, transition: "height 1s ease-out" }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div style={{ fontSize: 48, fontWeight: 300, color: "white", lineHeight: 1 }}>{liters.toFixed(1)}L</div>
            <div className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>of {goal.toFixed(1)}L goal</div>
          </div>
        </div>
        <div className="mt-4 text-[13px] font-medium" style={{ color }}>{pct}% hydrated</div>
      </Surface>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6">
        {[250, 500, 750, 1000].map(v => (
          <button key={v} type="button" onClick={() => setMl(m => Math.min(goal * 1000 + 1000, m + v))}
            className="shrink-0 h-11 px-5 rounded-full text-[13px] font-medium whitespace-nowrap"
            style={{ color, border: `1px solid ${color}66`, background: `${color}10` }}>
            +{v >= 1000 ? "1L" : `${v}ml`}
          </button>
        ))}
      </div>

      <Surface className="p-5">
        <Label className="mb-3">Today's reminders</Label>
        <div className="space-y-3">
          {reminders.map(r => (
            <div key={r.time} className="flex items-center justify-between min-h-[44px]">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full" style={{ background: r.done ? "#22c55e" : "rgba(255,255,255,0.25)" }} />
                <div className="text-white text-[15px]">{r.time}</div>
                <div className="text-[13px]" style={{ color: MUTED }}>{r.label}</div>
              </div>
              <div className="text-[11px]" style={{ color: r.done ? "#22c55e" : MUTED }}>{r.done ? "Done" : "Pending"}</div>
            </div>
          ))}
        </div>
      </Surface>

      <Surface className="p-5">
        <Label className="mb-3">7-day intake</Label>
        <div className="relative h-[120px] flex items-end gap-2">
          <div className="absolute left-0 right-0" style={{ bottom: `${(goal / 2.5) * 100}%`, borderTop: `1px dashed ${color}80` }} />
          {week.map((v, i) => (
            <div key={i} className="flex-1 rounded-md" style={{ height: `${(v / 2.5) * 100}%`, background: i === 6 ? color : `${color}55` }} />
          ))}
        </div>
        <div className="flex justify-between text-[11px] mt-2" style={{ color: MUTED }}>
          {["M","T","W","T","F","S","S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
      </Surface>
    </div>
  );
};

const StepsSection: React.FC = () => {
  const amber = FEATURES.steps.color;
  const coral = "#FF6E61";
  const green = "#22C55E";
  const steps = 6240, stepsGoal = 10000;
  const kcal = 312, kcalGoal = 500;
  const km = 4.1, kmGoal = 8;

  const hourly = [0,0,1,3,8,18,42,30,22,18,28,40,55,38,32,28,42,60,45,30,18,10,4,2];
  const week = [4200, 8800, 6100, 9300, 5400, 12000, steps];

  return (
    <div className="space-y-5">
      <Surface className="p-6 flex flex-col items-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 45%, ${amber}22, transparent 60%)` }} />
        <div className="relative">
          <Ring size={200} stroke={14} value={(steps / stepsGoal) * 100} color={amber} />
          <div className="absolute inset-[18px]"><Ring size={164} stroke={14} value={(kcal / kcalGoal) * 100} color={coral} delay={150} /></div>
          <div className="absolute inset-[36px]"><Ring size={128} stroke={14} value={(km / kmGoal) * 100} color={green} delay={300} /></div>
        </div>
        <div className="mt-4 text-center">
          <div style={{ fontSize: 36, fontWeight: 300, color: "white", lineHeight: 1 }}>{steps.toLocaleString()}</div>
          <Label className="mt-1">of {stepsGoal.toLocaleString()} steps</Label>
        </div>
      </Surface>

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

      <Surface className="p-5">
        <Label className="mb-3">Today by hour</Label>
        <div className="flex items-end gap-[3px] h-[90px]">
          {hourly.slice(6, 22).map((v, i) => {
            const peak = v >= 40;
            return <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(4, (v / 60) * 100)}%`, background: peak ? amber : `${amber}55` }} />;
          })}
        </div>
        <div className="flex justify-between text-[11px] mt-2" style={{ color: MUTED }}>
          <span>6AM</span><span>10AM</span><span>2PM</span><span>6PM</span><span>10PM</span>
        </div>
      </Surface>

      <Surface className="p-5">
        <Label className="mb-3">This week</Label>
        <div className="flex items-end gap-2 h-[100px]">
          {week.map((v, i) => (
            <div key={i} className="flex-1 rounded-md" style={{ height: `${(v / 12000) * 100}%`, background: i === 6 ? amber : `${amber}40` }} />
          ))}
        </div>
        <div className="flex justify-between text-[11px] mt-2" style={{ color: MUTED }}>
          {["M","T","W","T","F","S","S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
      </Surface>
    </div>
  );
};

const MedicationSection: React.FC = () => {
  const color = FEATURES.medication.color;
  const schedule = [
    { name: "Vitamin D",   dose: "1000 IU",   time: "08:00", status: "taken" },
    { name: "Metformin",   dose: "500 mg",    time: "13:00", status: "taken" },
    { name: "Omega-3",     dose: "1 capsule", time: "19:00", status: "upcoming" },
    { name: "Magnesium",   dose: "200 mg",    time: "22:00", status: "upcoming" },
  ] as const;
  const chip = (s: string) => {
    if (s === "taken")    return { c: "#22c55e", bg: "rgba(34,197,94,0.12)", l: "Taken" };
    if (s === "missed")   return { c: "#ef4444", bg: "rgba(239,68,68,0.12)", l: "Missed" };
    return { c: "rgba(255,255,255,0.6)", bg: "rgba(255,255,255,0.06)", l: "Upcoming" };
  };

  return (
    <div className="space-y-5">
      <Surface className="p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 40%, ${color}22, transparent 60%)` }} />
        <div className="relative">
          <div style={{ color, fontSize: 64, fontWeight: 300, lineHeight: 1 }}>91</div>
          <Label className="mt-2">Adherence score</Label>
          <div className="text-[11px] mt-1" style={{ color: MUTED }}>Last 30 days</div>
        </div>
      </Surface>

      <Surface className="p-5">
        <Label className="mb-4">Today's schedule</Label>
        <div className="relative pl-5">
          <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full" style={{ background: `${color}55` }} />
          <div className="space-y-4">
            {schedule.map((s, i) => {
              const c = chip(s.status);
              return (
                <div key={i} className="flex items-center justify-between min-h-[44px]">
                  <div>
                    <div className="text-white text-[16px] font-semibold">{s.name}</div>
                    <div className="text-[13px]" style={{ color: MUTED }}>{s.dose} · {s.time}</div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-medium" style={{ color: c.c, background: c.bg }}>{c.l}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Surface>

      <button type="button" className="w-full h-[52px] rounded-[16px] text-white font-medium flex items-center justify-center gap-2" style={{ background: FEATURES.water.color }}>
        <Plus className="w-4 h-4" /> Add Medication
      </button>

      <Surface className="p-5 flex gap-3" style={{ borderLeft: `3px solid ${color}` }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}1f`, color }}>
          <Pill className="w-4 h-4" />
        </div>
        <div>
          <div className="text-white text-[14px] font-medium mb-1">Tip</div>
          <div className="text-[13px]" style={{ color: MUTED }}>Taking medication at the same time daily improves effectiveness.</div>
        </div>
      </Surface>
    </div>
  );
};

const MeditationSection: React.FC = () => {
  const color = FEATURES.meditation.color;
  const sessions = [
    { title: "Box Breathing",   dur: "4 min",  cat: "Breathing", c: color },
    { title: "Focus Reset",     dur: "10 min", cat: "Focus",     c: "#7F77DD" },
    { title: "Sleep Wind-down", dur: "12 min", cat: "Sleep",     c: "#534AB7" },
    { title: "Anxiety Relief",  dur: "8 min",  cat: "Anxiety",   c: "#1D9E75" },
  ];
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <span className="px-3 py-1.5 rounded-full text-[12px] font-medium text-white" style={{ background: "rgba(255,255,255,0.06)", border: `0.5px solid ${BORDER}` }}>
          <Flame className="w-3 h-3 inline mr-1 text-orange-400" /> 4 day streak
        </span>
      </div>

      <Surface className="relative overflow-hidden h-[160px] p-5 flex items-center" style={{ background: `linear-gradient(135deg, ${color}33 0%, #1a2540 60%, ${SURFACE} 100%)` }}>
        {/* Soft abstract blobs */}
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl" style={{ background: `${color}66` }} />
        <div className="absolute -left-8 bottom-0 w-40 h-40 rounded-full blur-3xl" style={{ background: "#534AB766" }} />
        <div className="relative flex-1">
          <div className="text-white" style={{ fontSize: 22, fontWeight: 500 }}>Morning Calm</div>
          <div className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>5 min · Breathing</div>
        </div>
        <button type="button" className="relative w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "white" }}>
          <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: "white" }} />
          <Play className="w-5 h-5 text-black ml-0.5" fill="black" />
        </button>
      </Surface>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6">
        {["All","Breathing","Focus","Sleep","Anxiety","Stress"].map((c, i) => (
          <button key={c} type="button" className="shrink-0 h-9 px-4 rounded-full text-[12px] whitespace-nowrap"
            style={i === 0
              ? { background: color, color: "white" }
              : { color: "white", background: "rgba(255,255,255,0.04)", border: `0.5px solid ${BORDER}` }}>
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {sessions.map(s => (
          <Surface key={s.title} className="p-4 flex items-center gap-4" style={{ borderLeft: `3px solid ${s.c}` }}>
            <div className="flex-1">
              <div className="text-white text-[15px] font-medium">{s.title}</div>
              <div className="text-[12px] mt-0.5" style={{ color: MUTED }}>{s.dur} · {s.cat}</div>
            </div>
            <button type="button" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${s.c}22`, color: s.c }}>
              <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
            </button>
          </Surface>
        ))}
      </div>

      <div className="text-center text-[13px]" style={{ color: MUTED }}>12 sessions · 87 mins meditated</div>
    </div>
  );
};

/* ───────────────────────── page ───────────────────────── */

const HealthChallenges: React.FC = () => {
  usePageSEO({
    title: "Health Challenges - Prescribly",
    description: "Sleep, water, steps, medication and meditation — all in one wellness hub.",
    canonicalPath: "/health-challenges",
  });
  const navigate = useNavigate();
  const [tab, setTab] = useState<FeatureKey>("sleep");
  const [firstName, setFirstName] = useState("there");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const name = (user?.user_metadata?.first_name as string) || (user?.email?.split("@")[0]) || "there";
      setFirstName(name.charAt(0).toUpperCase() + name.slice(1));
    })();
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);

  // demo per-feature scores → multicolor ring + overall
  const scores: Record<FeatureKey, number> = { sleep: 78, water: 60, steps: 62, medication: 91, meditation: 80 };
  const overall = Math.round(ORDER.reduce((a, k) => a + scores[k], 0) / ORDER.length);

  const renderSection = () => {
    switch (tab) {
      case "sleep":      return <SleepSection />;
      case "water":      return <WaterSection />;
      case "steps":      return <StepsSection />;
      case "medication": return <MedicationSection />;
      case "meditation": return <MeditationSection />;
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
        {/* Header */}
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

        {/* Overall ring */}
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

          {/* quick jump chips */}
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

        {/* Sticky tab bar */}
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

        {/* Section content with transition */}
        <div key={tab} className="hc-anim mt-5">
          {renderSection()}
        </div>
      </div>
    </div>
  );
};

export default HealthChallenges;
