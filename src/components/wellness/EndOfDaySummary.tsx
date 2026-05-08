import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, TrendingDown, Mail, BellRing } from "lucide-react";
import { useWellnessPersistence } from "@/hooks/useWellnessPersistence";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { showNotification, requestNotificationPermission } from "@/lib/wellnessAlarm";

type Summary = {
  total_score: number; points_earned: number; points_lost: number;
  water_taken: number; water_missed: number;
  meds_taken: number; meds_missed: number;
  meditation_minutes: number; steps: number; sleep_hours: number;
  in_app_sent: boolean; email_sent: boolean;
};

export default function EndOfDaySummary() {
  const { user } = useAuth();
  const { computeEod } = useWellnessPersistence();
  const [s, setS] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const data = await computeEod();
    if (data) setS(data as any);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);

  // Auto-fire end-of-day notification once after 22:00 if not already
  useEffect(() => {
    const t = setInterval(async () => {
      if (!s) return;
      const hour = new Date().getHours();
      if (hour >= 22 && !s.in_app_sent) {
        await requestNotificationPermission();
        showNotification("🌙 Daily wellness summary", `Score ${s.total_score} · +${s.points_earned} / -${s.points_lost}`);
        toast({ title: "🌙 Today's wellness score", description: `${s.total_score} points (+${s.points_earned} / -${s.points_lost})` });
        if (user) {
          await supabase.from("wellness_eod_summary").update({ in_app_sent: true }).eq("user_id", user.id).eq("summary_date", new Date().toISOString().slice(0,10));
          // Try email (no-op if not configured)
          try {
            await supabase.functions.invoke("send-wellness-eod", { body: { date: new Date().toISOString().slice(0,10) } });
          } catch {}
          refresh();
        }
      }
    }, 60 * 1000);
    return () => clearInterval(t);
  }, [s?.in_app_sent, user?.id]);

  if (!s) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4" /> Today's score</CardTitle></CardHeader>
        <CardContent>
          <Button size="sm" onClick={refresh} disabled={loading}>{loading ? "Computing..." : "Compute now"}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Today's wellness score</span>
          <Badge variant="default" className="text-base">{s.total_score}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-green-200 bg-green-50/40 p-3">
            <div className="flex items-center gap-2 text-green-700 text-xs font-medium"><TrendingUp className="w-3 h-3" /> Earned</div>
            <p className="text-xl font-bold text-green-700">+{s.points_earned}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50/40 p-3">
            <div className="flex items-center gap-2 text-red-700 text-xs font-medium"><TrendingDown className="w-3 h-3" /> Lost</div>
            <p className="text-xl font-bold text-red-700">-{s.points_lost}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <Stat label="Water" v={`${s.water_taken}/${s.water_taken + s.water_missed}`} />
          <Stat label="Meds" v={`${s.meds_taken}/${s.meds_taken + s.meds_missed}`} />
          <Stat label="Meditation" v={`${s.meditation_minutes}m`} />
          <Stat label="Steps" v={s.steps.toLocaleString()} />
          <Stat label="Sleep" v={`${Number(s.sleep_hours).toFixed(1)}h`} />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1"><BellRing className="w-3 h-3" /> In-app: {s.in_app_sent ? "sent" : "pending 22:00"}</span>
          <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email: {s.email_sent ? "sent" : "—"}</span>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>{loading ? "Refreshing..." : "Refresh score"}</Button>
      </CardContent>
    </Card>
  );
}

const Stat = ({ label, v }: { label: string; v: string }) => (
  <div className="rounded-md border p-2">
    <p className="text-muted-foreground">{label}</p>
    <p className="font-semibold">{v}</p>
  </div>
);
