import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Droplets } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Slot = { id: string; slot_index: number; scheduled_at: string; ml: number; status: "taken" | "missed" | "pending" };

export default function HydrationTimeline() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [now, setNow] = useState(Date.now());
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("hydration_slots").select("*")
        .eq("user_id", user.id).eq("log_date", today).order("slot_index");
      setSlots((data ?? []) as Slot[]);
    };
    load();
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [user, today]);

  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const pct = (d: Date) => Math.min(100, Math.max(0, ((d.getTime() - dayStart.getTime()) / (24 * 3600_000)) * 100));
  const nowPct = pct(new Date(now));

  const upcoming = slots.find(s => s.status === "pending" && new Date(s.scheduled_at).getTime() > now);
  const missedCount = slots.filter(s => s.status === "missed").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" /> 24-hour hydration timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          {upcoming && (
            <Badge variant="secondary">
              Next: {new Date(upcoming.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Badge>
          )}
          {missedCount > 0 && <Badge variant="destructive">{missedCount} missed</Badge>}
          <Badge variant="outline">{slots.filter(s => s.status === "taken").length}/{slots.length} taken</Badge>
        </div>

        {/* Track */}
        <div className="relative h-16 rounded-lg bg-gradient-to-r from-blue-50 via-background to-blue-50 dark:from-blue-950/30 dark:to-blue-950/30 border">
          {/* Hour ticks */}
          {[0, 6, 12, 18, 24].map(h => (
            <div key={h} className="absolute top-0 bottom-0 border-l border-border/40" style={{ left: `${(h / 24) * 100}%` }}>
              <span className="absolute -bottom-5 -translate-x-1/2 text-[10px] text-muted-foreground">{h}:00</span>
            </div>
          ))}
          {/* Now indicator */}
          <div
            className="absolute top-0 bottom-0 w-px bg-primary"
            style={{ left: `${nowPct}%` }}
            title="Now"
          >
            <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
          </div>
          {/* Slots */}
          {slots.map(s => {
            const t = new Date(s.scheduled_at);
            const left = pct(t);
            const color = s.status === "taken" ? "bg-green-500" : s.status === "missed" ? "bg-destructive" : t.getTime() < now ? "bg-amber-500" : "bg-blue-500";
            return (
              <div key={s.id}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${color} ring-2 ring-background shadow`}
                style={{ left: `${left}%` }}
                title={`${t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — ${s.status}`}
              >
                <Droplets className="w-2 h-2 text-white absolute inset-0 m-auto" />
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-3">
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Taken</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-destructive inline-block" /> Missed</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Overdue</span>
          <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Upcoming</span>
        </div>
      </CardContent>
    </Card>
  );
}
