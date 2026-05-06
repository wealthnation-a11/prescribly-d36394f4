import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Droplet, Moon, Footprints, Pill, Flame, Trophy } from "lucide-react";
import { useWellnessTracking } from "@/hooks/useWellnessTracking";
import { Link } from "react-router-dom";

const TARGETS = { water: 8, sleep: 8, steps: 10000, drugs: 3 };

export const WellnessTrackers = () => {
  const { log, streak, update, loading } = useWellnessTracking();

  if (loading) return null;

  const cards = [
    {
      title: "Water", icon: Droplet, color: "text-blue-500", bg: "bg-blue-500/10",
      value: log.water_glasses, target: TARGETS.water, unit: "glasses",
      onAdd: () => update({ water_glasses: log.water_glasses + 1 }),
      onSub: () => update({ water_glasses: Math.max(0, log.water_glasses - 1) }),
    },
    {
      title: "Sleep", icon: Moon, color: "text-indigo-500", bg: "bg-indigo-500/10",
      value: log.sleep_hours, target: TARGETS.sleep, unit: "hours",
      onAdd: () => update({ sleep_hours: Math.min(24, log.sleep_hours + 0.5) }),
      onSub: () => update({ sleep_hours: Math.max(0, log.sleep_hours - 0.5) }),
    },
    {
      title: "Steps", icon: Footprints, color: "text-green-500", bg: "bg-green-500/10",
      value: log.steps, target: TARGETS.steps, unit: "steps",
      onAdd: () => update({ steps: log.steps + 500 }),
      onSub: () => update({ steps: Math.max(0, log.steps - 500) }),
    },
    {
      title: "Medication", icon: Pill, color: "text-pink-500", bg: "bg-pink-500/10",
      value: log.drugs_taken, target: TARGETS.drugs, unit: "doses",
      onAdd: () => update({ drugs_taken: log.drugs_taken + 1 }),
      onSub: () => update({ drugs_taken: Math.max(0, log.drugs_taken - 1) }),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="rounded-full bg-primary/15 p-3"><Flame className="w-6 h-6 text-primary" /></div>
          <div className="flex-1">
            <p className="text-2xl font-bold">{streak.current_streak} day{streak.current_streak === 1 ? "" : "s"}</p>
            <p className="text-xs text-muted-foreground">Current streak • Longest {streak.longest_streak} • Total {streak.total_active_days} active days</p>
          </div>
          <Link to="/gamification" className="text-xs text-primary hover:underline flex items-center gap-1">
            <Trophy className="w-4 h-4" /> Rewards
          </Link>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => {
          const pct = Math.min(100, Math.round((Number(c.value) / c.target) * 100));
          return (
            <Card key={c.title}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span className={`p-1.5 rounded-md ${c.bg}`}><c.icon className={`w-4 h-4 ${c.color}`} /></span>
                  {c.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xl font-bold">{c.value}<span className="text-xs text-muted-foreground font-normal"> / {c.target} {c.unit}</span></p>
                  <Progress value={pct} className="h-1.5 mt-1" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={c.onSub}>-</Button>
                  <Button size="sm" className="flex-1" onClick={c.onAdd}>+</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default WellnessTrackers;
