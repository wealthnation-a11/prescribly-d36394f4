// Self-contained design tokens for the Consultation module only.
// These intentionally live inside the module so no global theme is affected.
export const CT = {
  navy: "#0F1E3D",
  navySoft: "#1B2E52",
  blue: "#2563EB",
  blueSoft: "#EFF4FF",
  green: "#16A34A",
  red: "#DC2626",
  gray: "#F5F7FA",
  border: "#E5E9F0",
  text: "#0F172A",
  muted: "#64748B",
} as const;

export const CONSULTATION_FEE = 3500;
export const CONSULTATION_MINUTES = 20;

// Configurable calm background music for the waiting room (Screen 7).
export const DEFAULT_WAITING_AUDIO_URL =
  "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=relaxing-145038.mp3";

export const formatNaira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

export const mmss = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
};
