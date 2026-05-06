import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, HeartPulse } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question: string;
  category: string | null;
  options: string[] | null;
}

export const DailyHealthQuestions = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: qs }, { data: ans }] = await Promise.all([
        supabase.from("daily_questions").select("id,question,category,options").eq("is_active", true).limit(10),
        supabase.from("daily_question_answers").select("question_id,answer").eq("user_id", user.id).eq("answered_on", today),
      ]);
      setQuestions((qs ?? []) as any);
      const map: Record<string, string> = {};
      (ans ?? []).forEach((a: any) => { map[a.question_id] = a.answer; });
      setAnswered(map);
      setLoading(false);
    })();
  }, [user, today]);

  const submit = async (q: Question, answer: string) => {
    if (!user) return;
    setAnswered(prev => ({ ...prev, [q.id]: answer }));
    const { error } = await supabase.from("daily_question_answers").upsert({
      user_id: user.id, question_id: q.id, answer, answered_on: today,
    }, { onConflict: "user_id,question_id,answered_on" });
    if (error) toast({ title: "Could not save", variant: "destructive" });
  };

  if (loading) return null;
  const remaining = questions.filter(q => !answered[q.id]);
  const next = remaining[0];

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HeartPulse className="w-5 h-5 text-primary" />
          Daily Health Check-in
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {Object.keys(answered).length}/{questions.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!next ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            All done for today! Come back tomorrow.
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">{next.question}</p>
            <div className="flex flex-wrap gap-2">
              {(next.options ?? []).map(opt => (
                <Button key={opt} size="sm" variant="outline" onClick={() => submit(next, opt)}>
                  {opt}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyHealthQuestions;
