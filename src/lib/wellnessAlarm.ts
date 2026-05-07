// Lightweight alarm + sound utility (no binary assets).
// - Schedules in-app alarms via setTimeout (active while tab is open)
// - Triggers Browser Notification + plays generated chime
// - Provides procedurally-generated calming soundscapes for meditation

let _ctx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
  return _ctx;
};

export const requestNotificationPermission = async () => {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const r = await Notification.requestPermission();
  return r === "granted";
};

export const showNotification = (title: string, body: string) => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try { new Notification(title, { body, icon: "/icon-192.png", tag: title }); } catch {}
  }
};

// Plays a 3-beep chime that loops a few times (alarm feel)
export const playAlarmChime = (durationSec = 8) => {
  const ctx = getCtx(); if (!ctx) return () => {};
  const stops: Array<() => void> = [];
  const start = ctx.currentTime;
  const beep = (t: number, freq: number) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.02);
    g.gain.linearRampToValueAtTime(0, t + 0.45);
    osc.connect(g).connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.5);
    stops.push(() => { try { osc.stop(); } catch {} });
  };
  for (let i = 0; i < Math.ceil(durationSec / 1.6); i++) {
    beep(start + i * 1.6, 880);
    beep(start + i * 1.6 + 0.55, 660);
    beep(start + i * 1.6 + 1.1, 988);
  }
  return () => stops.forEach(s => s());
};

// ---- Calming sound generator (procedural) ----
export type CalmingTrack = {
  id: string;
  name: string;
  description: string;
  build: (ctx: AudioContext) => { stop: () => void };
};

const buildPad = (ctx: AudioContext, freqs: number[], gainVal = 0.06) => {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 1.5);
  master.connect(ctx.destination);
  const oscs = freqs.map((f) => {
    const o = ctx.createOscillator();
    o.type = "sine"; o.frequency.value = f;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07 + Math.random() * 0.1;
    lfoGain.gain.value = 1.5;
    lfo.connect(lfoGain).connect(o.frequency);
    lfo.start(); o.connect(master); o.start();
    return { o, lfo };
  });
  return {
    stop: () => {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      setTimeout(() => oscs.forEach(({ o, lfo }) => { try { o.stop(); lfo.stop(); } catch {} }), 700);
    },
  };
};

const buildNoise = (ctx: AudioContext, type: "rain" | "ocean" | "white", gainVal = 0.05) => {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < bufferSize; i++) {
    const w = Math.random() * 2 - 1;
    if (type === "white") data[i] = w * 0.5;
    else { last = (last + 0.02 * w) / 1.02; data[i] = last * 3.5; } // brown-ish
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer; src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = type === "rain" ? 2200 : 700;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 1.5);
  src.connect(filter).connect(g).connect(ctx.destination);
  // Ocean: slow LFO on filter for swells
  let lfo: OscillatorNode | null = null;
  if (type === "ocean") {
    lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 0.12; lg.gain.value = 250;
    lfo.connect(lg).connect(filter.frequency); lfo.start();
  }
  src.start();
  return {
    stop: () => {
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      setTimeout(() => { try { src.stop(); lfo?.stop(); } catch {} }, 700);
    },
  };
};

export const CALMING_TRACKS: CalmingTrack[] = [
  { id: "ocean", name: "Ocean Waves", description: "Soft brown noise with rolling swells", build: (c) => buildNoise(c, "ocean", 0.08) },
  { id: "rain", name: "Gentle Rain", description: "Soft pink-noise rainfall", build: (c) => buildNoise(c, "rain", 0.06) },
  { id: "forest-pad", name: "Forest Drone", description: "Warm low pad in C major", build: (c) => buildPad(c, [130.81, 196.0, 261.63], 0.05) },
  { id: "zen-bells", name: "Zen Bells", description: "Crystalline harmonic pad", build: (c) => buildPad(c, [261.63, 329.63, 392.0, 523.25], 0.04) },
  { id: "deep-breath", name: "Deep Breath", description: "Slow tide for breathwork", build: (c) => buildNoise(c, "ocean", 0.06) },
  { id: "white-fog", name: "White Fog", description: "Filtered white noise focus aid", build: (c) => buildNoise(c, "white", 0.04) },
];

export const playCalmingTrack = (id: string) => {
  const ctx = getCtx(); if (!ctx) return null;
  const track = CALMING_TRACKS.find(t => t.id === id);
  if (!track) return null;
  return track.build(ctx);
};

// ---- Scheduled alarm registry (in-tab) ----
type Scheduled = { id: string; at: number; timer: number; onFire: () => void };
const _registry = new Map<string, Scheduled>();

export const scheduleAlarm = (id: string, fireAt: Date, onFire: () => void) => {
  cancelAlarm(id);
  const delay = Math.max(0, fireAt.getTime() - Date.now());
  // setTimeout cap is ~24.8 days; we schedule shorter horizons (≤24h) so it's fine.
  const timer = window.setTimeout(() => {
    _registry.delete(id);
    onFire();
  }, delay);
  _registry.set(id, { id, at: fireAt.getTime(), timer, onFire });
};

export const cancelAlarm = (id: string) => {
  const ex = _registry.get(id);
  if (ex) { clearTimeout(ex.timer); _registry.delete(id); }
};

export const listScheduled = () => Array.from(_registry.values()).map(s => ({ id: s.id, at: s.at }));

// Splits a daily liter goal into evenly-spaced waking-hours reminders.
// Default window: 08:00 - 22:00 (14h) so user isn't woken up.
export const buildHydrationSchedule = (litersGoal: number, opts?: { startHour?: number; endHour?: number; mlPerGlass?: number }) => {
  const startHour = opts?.startHour ?? 8;
  const endHour = opts?.endHour ?? 22;
  const mlPerGlass = opts?.mlPerGlass ?? 250;
  const totalMl = litersGoal * 1000;
  const glasses = Math.max(1, Math.round(totalMl / mlPerGlass));
  const windowH = endHour - startHour;
  const stepMin = (windowH * 60) / glasses;
  const today = new Date(); today.setSeconds(0, 0);
  const slots: { time: Date; label: string; index: number }[] = [];
  for (let i = 0; i < glasses; i++) {
    const d = new Date(today);
    const totalMin = startHour * 60 + Math.round(stepMin * i);
    d.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0);
    slots.push({ time: d, label: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), index: i + 1 });
  }
  return { glasses, mlPerGlass, slots };
};
