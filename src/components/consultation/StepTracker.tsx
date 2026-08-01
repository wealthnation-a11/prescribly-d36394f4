import {
  Zap,
  MessageSquare,
  FileText,
  UserRound,
  CreditCard,
  CheckCircle2,
  Clock,
  Video,
  FlaskConical,
  FolderClosed,
} from "lucide-react";
import { CT } from "./consultationTheme";

export const CONSULTATION_STEPS = [
  { key: "type", label: "Type", Icon: Zap },
  { key: "mode", label: "Mode", Icon: MessageSquare },
  { key: "symptoms", label: "Symptoms", Icon: FileText },
  { key: "matching", label: "Doctor", Icon: UserRound },
  { key: "payment", label: "Payment", Icon: CreditCard },
  { key: "confirmation", label: "Confirm", Icon: CheckCircle2 },
  { key: "waiting", label: "Waiting", Icon: Clock },
  { key: "live", label: "Consult", Icon: Video },
  { key: "prescription", label: "Rx/Labs", Icon: FlaskConical },
  { key: "record", label: "Record", Icon: FolderClosed },
] as const;

export type ConsultationStepKey = (typeof CONSULTATION_STEPS)[number]["key"];

export function StepTracker({ current }: { current: ConsultationStepKey }) {
  const currentIndex = CONSULTATION_STEPS.findIndex((s) => s.key === current);

  return (
    <div
      className="sticky bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur px-2 py-2"
      style={{ borderColor: CT.border }}
    >
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {CONSULTATION_STEPS.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const bg = active ? CT.blue : done ? CT.green : "#EEF1F6";
          const fg = active || done ? "#FFFFFF" : CT.muted;
          return (
            <div key={s.key} className="flex flex-col items-center min-w-[52px] shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
                style={{ backgroundColor: bg, color: fg }}
              >
                <s.Icon className="w-3.5 h-3.5" />
              </div>
              <span
                className="text-[9px] mt-1 font-medium truncate max-w-[52px]"
                style={{ color: active ? CT.blue : CT.muted }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
