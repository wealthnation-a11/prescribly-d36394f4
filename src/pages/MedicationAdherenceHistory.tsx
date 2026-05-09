import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, History, Check, X, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePageSEO } from "@/hooks/usePageSEO";

type Dose = {
  id: string;
  drug_name: string;
  dosage: string | null;
  scheduled_at: string;
  status: "pending" | "taken" | "missed";
  dose_change: number;
  taken_at: string | null;
};

export default function MedicationAdherenceHistory() {
  usePageSEO({
    title: "Medication Adherence History - Prescribly",
    description: "Detailed log of every drug reminder, taken/missed status and dose adjustments.",
    canonicalPath: "/health-challenges/medication/history",
  });
  const { user } = useAuth();
  const [doses, setDoses] = useState<Dose[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from("medication_doses")
        .select("id, drug_name, dosage, scheduled_at, status, dose_change, taken_at")
        .eq("user_id", user.id)
        .gte("scheduled_at", since.toISOString())
        .order("scheduled_at", { ascending: false });
      setDoses((data ?? []) as Dose[]);
      setLoading(false);
    })();
  }, [user]);

  const grouped = doses.reduce<Record<string, Dose[]>>((acc, d) => {
    const day = new Date(d.scheduled_at).toLocaleDateString();
    (acc[day] ||= []).push(d); return acc;
  }, {});

  const dayKeys = Object.keys(grouped);

  return (
    <div className="min-h-screen medical-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon"><Link to="/health-challenges/medication"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-pink-500/10 border border-pink-500/20"><History className="h-6 w-6 text-pink-500" /></div>
            <div>
              <h1 className="text-2xl font-bold">Adherence History</h1>
              <p className="text-muted-foreground text-sm">Last 30 days of drug reminders, doses & changes</p>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : dayKeys.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No medication history yet. Add reminders and start logging your doses.</CardContent></Card>
        ) : (
          dayKeys.map(day => {
            const list = grouped[day];
            const taken = list.filter(d => d.status === "taken").length;
            const missed = list.filter(d => d.status === "missed").length;
            return (
              <Card key={day}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{day}</span>
                    <span className="flex gap-2 text-xs">
                      <Badge variant="default">✓ {taken} taken</Badge>
                      <Badge variant="destructive">✕ {missed} missed</Badge>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {list.map(d => (
                    <div key={d.id} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                      <div className="flex items-center gap-3">
                        {d.status === "taken" ? <Check className="w-4 h-4 text-green-600" /> :
                         d.status === "missed" ? <X className="w-4 h-4 text-red-500" /> :
                         <Clock className="w-4 h-4 text-muted-foreground" />}
                        <div>
                          <p className="font-medium">{d.drug_name} <span className="text-xs text-muted-foreground">{d.dosage ?? ""}</span></p>
                          <p className="text-xs text-muted-foreground">
                            Scheduled {new Date(d.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {d.taken_at && ` • Taken ${new Date(d.taken_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.dose_change !== 0 && (
                          <Badge variant="outline" className={d.dose_change > 0 ? "text-green-600" : "text-red-500"}>
                            {d.dose_change > 0 ? `+${d.dose_change}` : d.dose_change} dose
                          </Badge>
                        )}
                        <Badge variant={d.status === "taken" ? "default" : d.status === "missed" ? "destructive" : "secondary"}>
                          {d.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
