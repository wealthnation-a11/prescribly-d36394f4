import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  MessageSquareText, 
  Target, 
  Pill, 
  Calendar,
  CheckCircle,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SmartSymptomInput } from "@/components/wellness/SmartSymptomInput";
import { GuidedQuestions } from "@/components/wellness/GuidedQuestions";
import { DiagnosisResults } from "@/components/wellness/DiagnosisResults";
import { DoctorReviewPanel } from "@/components/wellness/DoctorReviewPanel";
import { useUserRole } from "@/hooks/useUserRole";
import { usePageSEO } from "@/hooks/usePageSEO";

interface DiagnosisData {
  sessionId: string;
  results: Array<{
    condition: string;
    probability: number;
    explanation: string;
  }>;
}

interface GuidedQuestionsData {
  age?: number;
  gender?: string;
  symptoms: string[];
}

export const AdvancedSystemAssessment = () => {
  usePageSEO({
    title: "Advanced AI Health Diagnostic Assistant | PrescriblyAI",
    description: "Experience the next generation of AI-powered health diagnostics. Get instant symptom analysis, personalized recommendations, and seamless doctor consultations with our advanced diagnostic assistant."
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { role } = useUserRole();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [diagnosisData, setDiagnosisData] = useState<DiagnosisData | null>(null);
  const [collectedSymptoms, setCollectedSymptoms] = useState<string[]>([]);
  const [guidedData, setGuidedData] = useState<GuidedQuestionsData | null>(null);

  const steps = [
    { number: 1, title: "Enter Symptoms", icon: MessageSquareText },
    { number: 2, title: "Clarifying Questions", icon: Target },
    { number: 3, title: "AI Analysis", icon: Brain },
    { number: 4, title: "Recommendations", icon: Pill },
    { number: 5, title: "Book Doctor", icon: Calendar }
  ];

  const handleSymptomSubmit = (symptoms: string[]) => {
    setCollectedSymptoms(symptoms);
    setCurrentStep(2);
  };

  const handleGuidedQuestionsComplete = (data: GuidedQuestionsData) => {
    setGuidedData(data);
    // Combine symptoms from both steps
    const allSymptoms = [...collectedSymptoms, ...data.symptoms];
    runDiagnosis(allSymptoms, data);
  };

  const runDiagnosis = async (symptoms: string[], additionalData?: GuidedQuestionsData) => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setCurrentStep(3);

    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      const response = await fetch(
        'https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/diagnose',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symptoms: symptoms,
            age: additionalData?.age,
            gender: additionalData?.gender
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Diagnosis failed');
      }

      const result = await response.json();
      
      setDiagnosisData(result);
      setCurrentStep(4);

      toast({
        title: "Diagnosis Complete",
        description: `Found ${result.results.length} potential conditions`,
      });

    } catch (error) {
      console.error('Diagnosis error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to get diagnosis. Please try again.",
        variant: "destructive",
      });
      setCurrentStep(2); // Go back to previous step
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDiagnosis = async () => {
    if (!user?.id || !diagnosisData) return;

    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      const response = await fetch(
        'https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/save-diagnosis',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: diagnosisData.sessionId,
            userId: user.id,
            conditions: diagnosisData.results
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save diagnosis');
      }

      toast({
        title: "Diagnosis Saved",
        description: "Your diagnosis has been saved successfully",
      });

    } catch (error) {
      console.error('Error saving diagnosis:', error);
      throw error;
    }
  };

  const handleBookDoctor = () => {
    if (diagnosisData) {
      navigate('/book-appointment', { 
        state: { 
          diagnosisSession: {
            id: diagnosisData.sessionId,
            symptoms: collectedSymptoms,
            conditions: diagnosisData.results,
            additionalInfo: guidedData
          }
        } 
      });
    }
  };

  const goToStep = (step: number) => {
    if (step <= currentStep || (step === 2 && collectedSymptoms.length > 0)) {
      setCurrentStep(step);
    }
  };

  const progressPercentage = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-slate-900 mb-3 flex items-center justify-center gap-3">
            <Brain className="w-10 h-10 text-primary" />
            Advanced AI Diagnostic Assistant
          </h1>
          <p className="text-lg text-slate-600 mb-6">
            Conversational, intelligent health assessment powered by advanced AI
          </p>

          {/* Progress Stepper */}
          <Card className="mb-8 shadow-lg">
            <CardContent className="p-6">
              <div className="mb-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Step {currentStep} of {steps.length}</span>
                  <span>{Math.round(progressPercentage)}% Complete</span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
              </div>
              
              <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = step.number === currentStep;
                  const isCompleted = step.number < currentStep;
                  const isClickable = step.number <= currentStep || 
                    (step.number === 2 && collectedSymptoms.length > 0);

                  return (
                    <div key={step.number} className="flex items-center">
                      <button
                        onClick={() => goToStep(step.number)}
                        disabled={!isClickable}
                        className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                          isClickable ? 'cursor-pointer hover:bg-primary/5' : 'cursor-not-allowed'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                          isActive 
                            ? 'bg-primary text-white shadow-lg scale-110' 
                            : isCompleted 
                              ? 'bg-green-500 text-white' 
                              : 'bg-muted text-muted-foreground'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-6 h-6" />
                          ) : (
                            <Icon className="w-6 h-6" />
                          )}
                        </div>
                        <span className={`text-xs font-medium text-center ${
                          isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                        }`}>
                          {step.title}
                        </span>
                      </button>
                      {index < steps.length - 1 && (
                        <div className={`w-8 h-1 mx-2 ${
                          step.number < currentStep ? 'bg-green-500' : 'bg-muted'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Doctor Review Panel (for doctors) */}
        {role === 'doctor' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <DoctorReviewPanel userRole={role} />
          </motion.div>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Smart Symptom Input */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="shadow-xl border-primary/10">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                    <MessageSquareText className="w-6 h-6 text-primary" />
                    Tell us about your symptoms
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Describe how you're feeling using natural language or select from common symptoms
                  </p>
                </CardHeader>
                <CardContent>
                  <SmartSymptomInput 
                    onSymptomSubmit={handleSymptomSubmit}
                    isLoading={loading}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Guided Questions */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="shadow-xl border-primary/10">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                    <Target className="w-6 h-6 text-primary" />
                    Help us understand better
                  </CardTitle>
                  <p className="text-muted-foreground">
                    A few quick questions to provide more accurate diagnosis
                  </p>
                </CardHeader>
                <CardContent>
                  <GuidedQuestions
                    onComplete={handleGuidedQuestionsComplete}
                    onBack={() => setCurrentStep(1)}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Loading / AI Analysis */}
          {currentStep === 3 && loading && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="shadow-xl border-primary/10">
                <CardContent className="text-center py-16">
                  <Brain className="w-16 h-16 text-primary mx-auto mb-6 animate-pulse" />
                  <h3 className="text-2xl font-bold mb-4">AI is analyzing your symptoms</h3>
                  <p className="text-muted-foreground mb-6">
                    Our advanced AI is processing your information to provide accurate diagnosis suggestions
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                    <span>This may take a few moments...</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4 & 5: Results & Recommendations */}
          {(currentStep === 4 || currentStep === 5) && diagnosisData && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DiagnosisResults
                data={diagnosisData}
                onBookDoctor={() => {
                  setCurrentStep(5);
                  handleBookDoctor();
                }}
                onSaveDiagnosis={handleSaveDiagnosis}
                userProfile={user}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        {!loading && currentStep > 1 && currentStep < 5 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between mt-8"
          >
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous Step
            </Button>

            {currentStep < 4 && diagnosisData && (
              <Button
                onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
                className="flex items-center gap-2"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </motion.div>
        )}

        {/* Footer Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
        >
          <p className="text-sm text-yellow-800">
            <strong>Medical Disclaimer:</strong> This AI assessment is for informational purposes only. 
            It does not replace professional medical advice, diagnosis, or treatment. Always consult 
            with a qualified healthcare provider for medical concerns.
          </p>
        </motion.div>
      </div>
    </div>
  );
};