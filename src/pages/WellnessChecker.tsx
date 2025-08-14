import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { usePageSEO } from "@/hooks/usePageSEO";
import { AdaptiveQuestionView } from "@/components/ai/AdaptiveQuestion";
import { DiagnosisResults } from "@/components/ai/DiagnosisResults";
import { ProgressSteps } from "@/components/ai/ProgressSteps";
import { ArrowLeft, Heart, Stethoscope, ShieldCheck } from "lucide-react";

const WellnessChecker = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  usePageSEO({
    title: "Wellness Checker - AI Health Assessment | Prescribly",
    description: "Complete wellness assessment with adaptive questioning, Bayesian diagnosis, and automated safe prescriptions.",
    canonicalPath: "/wellness-checker",
  });

  // Engine parameters
  const CONFIDENCE_THRESHOLD = 0.75;
  const MAX_QUESTIONS = 6;

  // State for symptom input
  const [mainSymptom, setMainSymptom] = useState("");
  const [additionalSymptoms, setAdditionalSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState<number>(5);
  const [commonSymptoms, setCommonSymptoms] = useState<string[]>([]);

  // State for diagnosis flow
  const [visitId, setVisitId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Array<{ id: string; value: string }>>([]);
  const [currentQuestion, setCurrentQuestion] = useState<{ id: string; text: string; options: string[] } | null>(null);
  const [differential, setDifferential] = useState<any[]>([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [safetyNotes, setSafetyNotes] = useState<string[]>([]);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [assessmentStarted, setAssessmentStarted] = useState(false);

  // Common symptoms checklist
  const COMMON_SYMPTOMS = [
    "Fever", "Headache", "Cough", "Sore throat", "Nausea", "Fatigue",
    "Body aches", "Shortness of breath", "Dizziness", "Stomach pain",
    "Chest pain", "Back pain", "Joint pain", "Skin rash"
  ];

  const selectedSymptoms = useMemo(() => {
    const base = mainSymptom ? [mainSymptom] : [];
    const extras = additionalSymptoms
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return [...base, ...extras, ...commonSymptoms];
  }, [mainSymptom, additionalSymptoms, commonSymptoms]);

  const symptomText = useMemo(() => {
    return `Main: ${mainSymptom}; Additional: ${additionalSymptoms || 'none'}; Duration: ${duration || 'n/a'}; Severity: ${severity}/10`;
  }, [mainSymptom, additionalSymptoms, duration, severity]);

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
        
        // Save to Supabase wellness_check_results table
        const { error: insertError } = await supabase
          .from('wellness_check_results')
          .insert({
            user_id: user?.id,
            patient_info: {
              name: user?.user_metadata?.full_name || 'Anonymous',
              age: null,
              gender: null
            },
            symptoms: selectedSymptoms || [],
            diagnosis: res.diagnoses?.[0]?.name || 'No diagnosis available',
            prescription: res.prescription ? {
              medications: res.prescription.medications || []
            } : {},
            instructions: res.safetyFlags?.length > 0 
              ? `Safety considerations: ${res.safetyFlags.join(', ')}`
              : 'Follow general health guidelines and consult with a healthcare provider.'
          });

        if (insertError) {
          console.error('Error saving to wellness_check_results:', insertError);
          toast({
            title: "Warning", 
            description: "Results processed but not saved. You can still view them.",
            variant: "destructive",
          });
        }

        // Navigate to prescription page
        navigate('/prescription');
        
        if (res.status === 'no_safe_medication') {
          toast({ 
            title: 'Assessment Complete', 
            description: 'Please consider booking an appointment for further evaluation.' 
          });
        } else if (res.status === 'prescription_generated') {
          toast({ 
            title: 'Wellness assessment complete', 
            description: 'Safe prescription generated and available for download.' 
          });
        }
      }
    } catch (e: any) {
      let errorTitle = 'Assessment Error';
      let errorDescription = 'Unable to process assessment at the moment';
      
      // Check for specific error types
      if (e.message) {
        if (e.message.includes('insufficient_quota') || e.message.includes('quota')) {
          errorTitle = 'Service Temporarily Unavailable';
          errorDescription = 'Our AI service is currently at capacity. Please try again in a few minutes or contact support if the issue persists.';
        } else if (e.message.includes('OpenAI error')) {
          errorTitle = 'AI Service Error';
          errorDescription = 'There was an issue with our AI analysis service. Please try again shortly.';
        } else if (e.message.includes('Unauthorized')) {
          errorTitle = 'Authentication Error';
          errorDescription = 'Please log in again to continue your assessment.';
        } else {
          errorDescription = e.message;
        }
      }
      
      toast({ 
        title: errorTitle, 
        description: errorDescription, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async () => {
    if (!mainSymptom.trim()) {
      toast({ title: 'Symptom Required', description: 'Please enter your main symptom.', variant: 'destructive' });
      return;
    }
    setAssessmentStarted(true);
    await startOrContinue([]);
  };

  const handleAnswer = async (value: string) => {
    const next = [...answers, { id: currentQuestion!.id, value }];
    setAnswers(next);
    const extra: any = {};
    if (currentQuestion?.id === 'pregnant') {
      extra.pregnancy_status = value === 'yes';
    }
    await startOrContinue(next, extra);
  };

  const handleSymptomToggle = (symptom: string, checked: boolean) => {
    if (checked) {
      setCommonSymptoms(prev => [...prev, symptom]);
    } else {
      setCommonSymptoms(prev => prev.filter(s => s !== symptom));
    }
  };

  const onPrint = () => {
    if (prescriptionId) navigate(`/prescriptions/print/${prescriptionId}`);
  };

  if (!assessmentStarted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-foreground p-6 text-white">
          <div className="max-w-2xl mx-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')} 
              className="text-white hover:bg-white/20 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-3 mb-4">
              <Heart className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Wellness Checker</h1>
            </div>
            <p className="text-white/90">
              AI-powered health assessment with adaptive questioning and safe prescription generation
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Stethoscope className="w-5 h-5" />
                <span>Symptom Assessment</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="main-symptom">What's your main concern today?</Label>
                <Textarea
                  id="main-symptom"
                  placeholder="Describe your main symptom in detail..."
                  value={mainSymptom}
                  onChange={(e) => setMainSymptom(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional">Any additional symptoms?</Label>
                <Textarea
                  id="additional"
                  placeholder="List any other symptoms you're experiencing..."
                  value={additionalSymptoms}
                  onChange={(e) => setAdditionalSymptoms(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">How long have you had these symptoms?</Label>
                  <Input
                    id="duration"
                    placeholder="e.g., 2 days, 1 week"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity (1-10)</Label>
                  <Input
                    id="severity"
                    type="number"
                    min="1"
                    max="10"
                    value={severity}
                    onChange={(e) => setSeverity(parseInt(e.target.value) || 5)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Check any symptoms you're also experiencing:</Label>
                <div className="grid grid-cols-2 gap-3">
                  {COMMON_SYMPTOMS.map((symptom) => (
                    <div key={symptom} className="flex items-center space-x-2">
                      <Checkbox
                        id={symptom}
                        checked={commonSymptoms.includes(symptom)}
                        onCheckedChange={(checked) => handleSymptomToggle(symptom, !!checked)}
                      />
                      <Label htmlFor={symptom} className="text-sm">{symptom}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleStartAssessment} 
                className="w-full" 
                size="lg"
                disabled={!mainSymptom.trim()}
              >
                Start Wellness Assessment
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 text-muted-foreground">
                <ShieldCheck className="w-5 h-5" />
                <div className="text-sm">
                  <p className="font-medium">Safe & Secure Assessment</p>
                  <p>AI-powered diagnosis with automated safety checks and RxNorm validation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary p-4 text-white">
        <div className="max-w-md mx-auto flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/wellness-checker')} 
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <Heart className="w-5 h-5" />
            <h1 className="text-lg font-semibold">Wellness Assessment</h1>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-md mx-auto w-full p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Adaptive health assessment</div>
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
              <div className="text-sm text-muted-foreground">Analyzing symptoms...</div>
            )}

            {finished && (
              <DiagnosisResults 
                diagnoses={diagnoses} 
                safetyNotes={safetyNotes} 
                prescriptionId={prescriptionId} 
                onPrint={onPrint} 
              />
            )}
          </CardContent>
        </Card>

        {finished && (
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => navigate('/my-prescriptions')}>
              View All Prescriptions
            </Button>
            <Button className="w-full" onClick={() => navigate('/book-appointment')}>
              Book an Appointment
            </Button>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="max-w-md mx-auto w-full p-4 border-t bg-white">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
            New Assessment
          </Button>
          {prescriptionId && (
            <Button className="flex-1" onClick={onPrint}>Print Prescription</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WellnessChecker;