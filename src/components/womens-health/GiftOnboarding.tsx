import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWomensProfile } from "@/hooks/useWomensProfile";
import WHLayout from "@/components/womens-health/WHLayout";

type Step = "welcome" | "dates" | "length" | "analyzing" | "done";

interface Props { onFinished: () => void }

/**
 * Gift onboarding wizard — asks the user for her last 3 period start dates and
 * typical duration, then saves them to cycle_records + women_profiles and shows
 * the "Analyzing" → "Predictions updated!" transition.
 */
const GiftOnboarding = ({ onFinished }: Props) => {
  const { user } = useAuth();
  const { save } = useWomensProfile();
  const [step, setStep] = useState<Step>("welcome");
  const [d1, setD1] = useState("");
  const [d2, setD2] = useState("");
  const [d3, setD3] = useState("");
  const [len, setLen] = useState(5);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const persist = async () => {
    if (!user) return;
    const dates = [d1, d2, d3].filter(Boolean).sort(); // ascending
    if (dates.length < 1) {
      toast({ title: "Add at least one date", variant: "destructive" });
      setStep("dates");
      return;
    }
    // Compute avg cycle length from consecutive dates
    let avgCycle = 28;
    if (dates.length >= 2) {
      const diffs: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        diffs.push(differenceInCalendarDays(parseISO(dates[i]), parseISO(dates[i - 1])));
      }
      const mean = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
      if (mean >= 21 && mean <= 40) avgCycle = mean;
    }
    // Save cycle records
    const rows = dates.map(dt => ({ user_id: user.id, cycle_start_date: dt, period_length: len }));
    const { error: crErr } = await (supabase as any)
      .from("cycle_records")
      .upsert(rows, { onConflict: "user_id,cycle_start_date" });
    if (crErr) console.warn(crErr);
    // Save profile
    await save({
      last_period_start: dates[dates.length - 1],
      avg_cycle_length: avgCycle,
      avg_period_length: len,
      mode: "cycle",
    });
  };

  const goAnalyze = async () => {
    setStep("analyzing");
    await Promise.all([persist(), new Promise(r => setTimeout(r, 2200))]);
    setStep("done");
    setTimeout(() => onFinished(), 1600);
  };

  return (
    <WHLayout title="Set up with Gift" showBack>
      <AnimatePresence mode="wait">
        {step === "welcome" && (
          <motion.div key="w" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GiftBubble text="Hi, I'm Gift 💗 I'll help you track your cycle. To make my predictions accurate, share the start dates of your last 3 periods and how many days each usually lasts." />
            <Button className="w-full mt-4 bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full" onClick={() => setStep("dates")}>
              Let's start
            </Button>
          </motion.div>
        )}

        {step === "dates" && (
          <motion.div key="d" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GiftBubble text="Enter the first day of each of your last periods (most recent first). If you only remember one, that's okay too." />
            <Card className="p-4 space-y-3 mt-3">
              <div><Label>Most recent period start</Label><Input type="date" max={todayStr} value={d1} onChange={e => setD1(e.target.value)} className="mt-1" /></div>
              <div><Label>The one before</Label><Input type="date" max={todayStr} value={d2} onChange={e => setD2(e.target.value)} className="mt-1" /></div>
              <div><Label>And the one before that</Label><Input type="date" max={todayStr} value={d3} onChange={e => setD3(e.target.value)} className="mt-1" /></div>
            </Card>
            <Button className="w-full mt-4 bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full" disabled={!d1} onClick={() => setStep("length")}>Continue</Button>
          </motion.div>
        )}

        {step === "length" && (
          <motion.div key="l" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GiftBubble text="How many days does your period usually last?" />
            <Card className="p-5 mt-3">
              <Label>Typical period length: <span className="text-wh-pink font-bold">{len} days</span></Label>
              <Slider value={[len]} min={2} max={10} step={1} onValueChange={v => setLen(v[0])} className="mt-3" />
            </Card>
            <Button className="w-full mt-4 bg-wh-pink hover:bg-wh-pink-deep text-white rounded-full" onClick={goAnalyze}>Analyze my cycle</Button>
          </motion.div>
        )}

        {step === "analyzing" && (
          <motion.div key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="min-h-[60vh] flex flex-col items-center justify-center text-center">
            <div className="relative h-24 w-24">
              <motion.div className="absolute inset-0 rounded-full border-4 border-wh-pink/30" />
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-wh-pink"
                animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
              />
            </div>
            <p className="mt-6 text-lg font-semibold">Analyzing your data</p>
            <p className="text-sm text-muted-foreground mt-1">Gift is learning your cycle…</p>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="min-h-[60vh] flex flex-col items-center justify-center text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
              <CheckCircle2 className="h-20 w-20 text-wh-pink" />
            </motion.div>
            <p className="mt-4 text-xl font-bold">Predictions updated!</p>
            <p className="text-sm text-muted-foreground mt-1">Your calendar is ready.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </WHLayout>
  );
};

const GiftBubble = ({ text }: { text: string }) => (
  <div className="flex gap-3 items-start">
    <div className="h-10 w-10 rounded-full bg-wh-pink grid place-items-center shrink-0 shadow-md">
      <Sparkles className="h-5 w-5 text-white" />
    </div>
    <Card className="p-3 rounded-2xl rounded-tl-sm flex-1 bg-muted/40 border-0">
      <p className="text-sm leading-snug"><span className="font-semibold text-wh-pink">Gift</span> · {text}</p>
    </Card>
  </div>
);

export default GiftOnboarding;
