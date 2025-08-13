import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { usePageSEO } from "@/hooks/usePageSEO";
import { AdaptiveQuestionView } from "@/components/ai/AdaptiveQuestion";
import { DiagnosisResults } from "@/components/ai/DiagnosisResults";
import { ProgressSteps } from "@/components/ai/ProgressSteps";
import { ArrowLeft, Bot } from "lucide-react";

// Refactored AI Diagnosis with adaptive Bayesian questioning and auto-prescription
const AIDiagnosis = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  usePageSEO({
    title: "AI Diagnosis - Automated Bayesian Engine | Prescribly",
    description: "Adaptive symptom questioning with Bayesian diagnostics and safe, automated prescriptions.",
    canonicalPath: "/ai-diagnosis",
  });

  const symptomData = location.state?.symptomData as
    | {
        mainSymptom: string;
        additionalSymptoms?: string;
        duration?: string;
        severity?: number | number[];
      }
    | undefined;

  // Engine params
  const CONFIDENCE_THRESHOLD = 0.75;
  const MAX_QUESTIONS = 6;

  // State
  const [visitId, setVisitId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Array<{ id: string; value: string }>>([]);
  const [currentQuestion, setCurrentQuestion] = useState<{ id: string; text: string; options: string[] } | null>(null);
  const [differential, setDifferential] = useState<any[]>([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [safetyNotes, setSafetyNotes] = useState<string[]>([]);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);

  const selectedSymptoms = useMemo(() => {
    if (!symptomData) return [] as string[];
    const base = [symptomData.mainSymptom];
    const extras = (symptomData.additionalSymptoms || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return [...base, ...extras];
  }, [symptomData]);

  const symptomText = useMemo(() => {
    if (!symptomData) return '';
    const sev = Array.isArray(symptomData.severity) ? symptomData.severity[0] : symptomData.severity;
    return `Main: ${symptomData.mainSymptom}; Additional: ${symptomData.additionalSymptoms || 'none'}; Duration: ${symptomData.duration || 'n/a'}; Severity: ${sev ?? 'n/a'}`;
  }, [symptomData]);

  const invoke = async (payload: any) => {
    const { data, error } = await supabase.functions.invoke('ai-diagnosis', { body: payload });
    if (error) throw error;
    return data as any;
  };

  const startOrContinue = async (nextAnswers: Array<{ id: string; value: string }>, extra?: { pregnancy_status?: boolean }) => {
    setLoading(true);
    try {
      const res = await invoke({
        visitId,
        symptomText,
        selectedSymptoms,
        answers: nextAnswers,
        options: { threshold: CONFIDENCE_THRESHOLD, max_questions: MAX_QUESTIONS },
        ...(extra || {}),
      });

      if (res.visitId && !visitId) setVisitId(res.visitId);
      if (!res.finished) {
        setCurrentQuestion(res.nextQuestion || null);
        setDifferential(res.differential || []);
        setFinished(false);
      } else {
        setFinished(true);
        setCurrentQuestion(null);
        setDiagnoses(res.diagnoses || []);
        setSafetyNotes(res.safetyFlags || []);
        setPrescriptionId(res.prescription?.id || null);
        if (res.status === 'no_safe_medication') {
          toast({ title: 'No safe prescription available', description: 'Please consider booking an appointment.' });
        } else if (res.status === 'prescription_generated') {
          toast({ title: 'Prescription generated', description: 'You can view and print it now.' });
        }
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Unable to process at the moment', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Initialize flow on mount if symptomData present
  useEffect(() => {
    if (symptomData) startOrContinue([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symptomData]);

  const handleAnswer = async (value: string) => {
    const next = [...answers, { id: currentQuestion!.id, value }];
    setAnswers(next);
    const extra: any = {};
    if (currentQuestion?.id === 'pregnant') {
      extra.pregnancy_status = value === 'yes';
    }
    await startOrContinue(next, extra);
  };

  const onPrint = () => {
    if (prescriptionId) navigate(`/prescriptions/print/${prescriptionId}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary p-4 text-white">
        <div className="max-w-md mx-auto flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5" />
            <h1 className="text-lg font-semibold">AI Diagnosis</h1>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-md mx-auto w-full p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Adaptive symptom assessment</div>
              <ProgressSteps current={Math.min(answers.length + (finished ? 1 : 0), MAX_QUESTIONS)} total={MAX_QUESTIONS} />
            </div>

            {!finished && currentQuestion && (
              <AdaptiveQuestionView
                question={{
                  id: currentQuestion.id,
                  text: currentQuestion.text,
                  options: currentQuestion.options.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) })),
                }}
                onAnswer={handleAnswer}
                disabled={loading}
              />
            )}

            {!finished && !currentQuestion && (
              <div className="text-sm text-muted-foreground">Preparing questions…</div>
            )}

            {finished && (
              <DiagnosisResults diagnoses={diagnoses} safetyNotes={safetyNotes} prescriptionId={prescriptionId} onPrint={onPrint} />
            )}
          </CardContent>
        </Card>

        {finished && (
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => navigate('/my-prescriptions')}>Go to My Prescriptions</Button>
            <Button className="w-full" onClick={() => navigate('/book-appointment')}>Book an Appointment</Button>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="max-w-md mx-auto w-full p-4 border-t bg-white">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => navigate('/symptom-form')}>Restart</Button>
          {prescriptionId && (
            <Button className="flex-1" onClick={onPrint}>Print Prescription</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIDiagnosis;