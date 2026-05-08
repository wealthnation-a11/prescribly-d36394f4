import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, ChevronUp, ChevronDown, Check, X } from "lucide-react";
import { useWellnessPersistence } from "@/hooks/useWellnessPersistence";

type Dose = {
  id: string;
  drug_name: string;
  dosage: string | null;
  scheduled_at: string;
  status: "pending" | "taken" | "missed" | "skipped";
  dose_change: number;
  notes: string | null;
};

export default function MedicationAdherenceHistory() {
  const { loadMedicationHistory } = useWellnessPersistence();
  const [doses, setDoses] = useState<Dose[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const data = await loadMedicationHistory(14);
    setDoses(data as any);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const groups: Record<string, Dose[]> = {};
  doses.forEach(d => {
    const k = new Date(d.scheduled_at).toISOString().slice(0, 10);
    (groups[k] ||= []).push(d);
  });
  const days = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Pill className="w-4 h-4 text-purple-500" /> Adherence history (14 days)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && days.length === 0 && (
          <p className="text-sm text-muted-foreground">No medication doses logged yet. Mark a dose taken or missed to start your history.</p>
        )}
        {days.map(d => {
          const items = groups[d];
          const taken = items.filter(i => i.status === "taken").length;
          const missed = items.filter(i => i.status === "missed").length;
          return (
            <div key={d} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm">{new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">{taken} taken</Badge>
                  {missed > 0 && <Badge variant="destructive">{missed} missed</Badge>}
                </div>
              </div>
              <ul className="space-y-1.5">
                {items.map(i => (
                  <li key={i.id} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      {i.status === "taken" ? <Check className="w-3.5 h-3.5 text-green-600" /> :
                       i.status === "missed" ? <X className="w-3.5 h-3.5 text-red-600" /> :
                       <span className="w-3.5 h-3.5 rounded-full border" />}
                      <span className="font-medium">{i.drug_name}</span>
                      {i.dosage && <span className="text-muted-foreground">· {i.dosage}</span>}
                    </span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {i.dose_change !== 0 && (
                        <span className={`flex items-center gap-0.5 ${i.dose_change > 0 ? "text-blue-600" : "text-orange-600"}`}>
                          {i.dose_change > 0 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {Math.abs(i.dose_change)}
                        </span>
                      )}
                      <span>{new Date(i.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
