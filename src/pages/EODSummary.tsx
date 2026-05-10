import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, Trophy, Droplets, Pill, Brain, Footprints, Moon, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { usePageSEO } from "@/hooks/usePageSEO";

type Row = {
  summary_date: string; total_score: number; points_earned: number; points_lost: number;
  water_taken: number; water_missed: number; meds_taken: number; meds_missed: number;
  meditation_minutes: number; steps: number; sleep_hours: number;
};

export default function EODSummary() {
  usePageSEO({ title: "End-of-day Wellness Summary", description: "See your daily wellness score, points earned and lost.", canonicalPath: "/eod-summary" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [today, setToday] = useState<Row | null>(null);
  const [history, setHistory] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const date = new Date().toISOString().slice(0, 10);
    try {
      await (supabase.rpc as any)("compute_eod_summary", { _user_id: user.id, _date: date });
    } catch (e) { console.warn(e); }
    const { data } = await supabase
      .from("wellness_eod_summary").select("*")
      .eq("user_id", user.id).order("summary_date", { ascending: false }).limit(30);
    const rows = (data ?? []) as unknown as Row[];
    setToday(rows.find(r => r.summary_date === date) ?? null);
    setHistory(rows);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user]);

  const sendEmail = async () => {
    if (!user || !today) return;
    try {
      await supabase.functions.invoke("send-email-notification", {
        body: {
          to_email: (user as any).email,
          subject: `Your daily wellness summary — Score ${today.total_score}`,
          message: `Score: ${today.total_score}\nEarned: +${today.points_earned}\nLost: -${today.points_lost}\nWater: ${today.water_taken}/${today.water_taken + today.water_missed}\nMeds: ${today.meds_taken}/${today.meds_taken + today.meds_missed}\nMeditation: ${today.meditation_minutes} min\nSteps: ${today.steps}\nSleep: ${today.sleep_hours}h`,
          notification_type: "eod_summary",
        },
      });
      toast({ title: "Email sent", description: "Check your inbox." });
    } catch (e: any) {
      toast({ title: "Email failed", description: e?.message ?? "Try again later.", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        <Button size="sm" variant="outline" onClick={sendEmail} disabled={!today}><Mail className="w-4 h-4 mr-2" />Email me today's summary</Button>
      </div>

      <h1 className="text-2xl font-bold mb-1">End-of-day wellness summary</h1>
      <p className="text-muted-foreground mb-6">Your score for today plus the last 30 days of history.</p>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Today's score</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : !today ? (
            <p className="text-sm text-muted-foreground">No activity logged yet today. Complete water, meds, meditation, sleep or steps to build your score.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold">{today.total_score}</span>
                <Badge variant="default" className="gap-1"><TrendingUp className="w-3 h-3" />+{today.points_earned}</Badge>
                <Badge variant="destructive" className="gap-1"><TrendingDown className="w-3 h-3" />-{today.points_lost}</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                <Stat icon={<Droplets className="w-4 h-4 text-blue-500" />} label="Water" value={`${today.water_taken}/${today.water_taken + today.water_missed}`} />
                <Stat icon={<Pill className="w-4 h-4 text-rose-500" />} label="Meds" value={`${today.meds_taken}/${today.meds_taken + today.meds_missed}`} />
                <Stat icon={<Brain className="w-4 h-4 text-violet-500" />} label="Meditation" value={`${today.meditation_minutes} min`} />
                <Stat icon={<Footprints className="w-4 h-4 text-emerald-500" />} label="Steps" value={String(today.steps)} />
                <Stat icon={<Moon className="w-4 h-4 text-indigo-500" />} label="Sleep" value={`${today.sleep_hours}h`} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">History (last 30 days)</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? <p className="text-sm text-muted-foreground">No history yet.</p> : (
            <div className="divide-y">
              {history.map(r => (
                <div key={r.summary_date} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium">{new Date(r.summary_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                  <div className="flex gap-2 items-center">
                    <span className="text-emerald-600">+{r.points_earned}</span>
                    <span className="text-destructive">-{r.points_lost}</span>
                    <Badge variant="outline">Score {r.total_score}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-lg border p-3">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
    <div className="text-base font-semibold mt-1">{value}</div>
  </div>
);
