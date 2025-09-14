import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { usePageSEO } from '@/hooks/usePageSEO';
import { SmartSymptomInput } from '@/components/wellness/SmartSymptomInput';
import { DoctorReviewPanel } from '@/components/wellness/DoctorReviewPanel';
import { ClarifyingQuestions } from '@/components/wellness/ClarifyingQuestions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Shield, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  Target,
  Stethoscope,
  Pill,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, title: 'Enter Symptoms', description: 'Tell us what you\'re experiencing', icon: Stethoscope },
  { id: 2, title: 'Clarifying Questions', description: 'Help us understand better', icon: Target },
  { id: 3, title: 'AI Analysis', description: 'Review diagnosis results', icon: Brain },
];

interface ClarifyingQuestion {
  id: string;
  question: string;
  type: 'select' | 'text' | 'scale';
  options?: string[];
}

interface DiagnosisResult {
  condition: string;
  probability: number;
  explanation: string;
  recommendations: string[];
}

export const SystemAssessment = () => {
  usePageSEO({
    title: "Advanced AI Health Assessment - Smart Diagnostic Assistant | PrescriblyAI",
    description: "Experience our advanced diagnostic assistant with smart symptom input, AI analysis, and professional healthcare guidance. Get accurate medical insights in minutes."
  });

  const { user } = useAuth();
  const { role } = useUserRole();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [clarifyingAnswers, setClarifyingAnswers] = useState<Record<string, string>>({});
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Doctor view
  if (role === 'doctor') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 p-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center justify-center gap-3">
              <Brain className="w-10 h-10 text-primary" />
              Doctor Review Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">Review and approve AI diagnostic recommendations</p>
          </div>
          <DoctorReviewPanel userRole={role || ''} />
        </div>
      </div>
    );
  }

  const handleSymptomSubmit = async (submittedSymptoms: string[]) => {
    setSymptoms(submittedSymptoms);
    setLoading(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) {
        toast.error('Please log in to continue');
        return;
      }

      // Call generate-questions endpoint
      const response = await fetch(`https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/generate-questions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symptoms: submittedSymptoms
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.questions && data.questions.length > 0) {
          setClarifyingQuestions(data.questions);
          setSessionId(data.session_id);
          setCurrentStep(2);
        } else {
          // Skip to diagnosis if no questions generated
          await runDiagnosis(submittedSymptoms, []);
        }
      } else {
        throw new Error('Failed to generate questions');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error('Failed to generate clarifying questions');
    } finally {
      setLoading(false);
    }
  };

  const handleClarifyingSubmit = async () => {
    const answers = clarifyingQuestions.map(q => clarifyingAnswers[q.id] || '');
    await runDiagnosis(symptoms, answers);
  };

  const runDiagnosis = async (symptomsToAnalyze: string[], answersToAnalyze: string[]) => {
    setLoading(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) {
        toast.error('Please log in to continue');
        return;
      }

      const response = await fetch(`https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/diagnose`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symptoms: symptomsToAnalyze,
          answers: answersToAnalyze,
          session_id: sessionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDiagnosisResult({
            condition: data.condition,
            probability: data.probability,
            explanation: data.explanation,
            recommendations: data.recommendations
          });
          setSessionId(data.session_id);
          setCurrentStep(3);
        } else {
          throw new Error(data.error || 'Diagnosis failed');
        }
      } else {
        throw new Error('Failed to perform diagnosis');
      }
    } catch (error) {
      console.error('Diagnosis error:', error);
      toast.error('Diagnosis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Tell us your symptoms</h2>
              <p className="text-muted-foreground">Enter all the symptoms you're experiencing</p>
            </div>
            <SmartSymptomInput onSymptomSubmit={handleSymptomSubmit} />
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">A few quick questions</h2>
              <p className="text-muted-foreground">Help us understand your symptoms better</p>
            </div>
            <ClarifyingQuestions 
              questions={clarifyingQuestions}
              answers={clarifyingAnswers}
              onAnswerChange={(questionId, answer) => {
                setClarifyingAnswers(prev => ({
                  ...prev,
                  [questionId]: answer
                }));
              }}
              onSubmit={handleClarifyingSubmit}
              onBack={() => setCurrentStep(1)}
              isLoading={loading}
            />
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Diagnosis Result</h2>
              <p className="text-muted-foreground">Based on your symptoms and answers</p>
            </div>
            
            {diagnosisResult && (
              <Card className="max-w-2xl mx-auto">
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <CheckCircle className="w-12 h-12 text-primary" />
                    <div>
                      <CardTitle className="text-2xl font-bold text-primary">
                        {diagnosisResult.condition}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Likelihood: {Math.round(diagnosisResult.probability * 100)}%
                      </p>
                    </div>
                  </div>
                  <Progress 
                    value={diagnosisResult.probability * 100} 
                    className="w-full h-3"
                  />
                  {diagnosisResult.probability > 0.8 && (
                    <Badge variant="destructive" className="mt-2">
                      ⚠️ Seek medical attention quickly
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Explanation</h3>
                    <p className="text-muted-foreground">{diagnosisResult.explanation}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Recommendations</h3>
                    <ul className="space-y-2">
                      {diagnosisResult.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={() => navigate('/book-appointment', { 
                        state: { sessionId, referringPage: 'system-assessment' } 
                      })}
                      className="flex-1"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Doctor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
      {/* Header */}
      <div className="bg-card/50 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">AI Health Assessment</h1>
                <p className="text-sm text-muted-foreground">Advanced diagnostic assistance</p>
              </div>
            </div>
            <Badge variant="outline" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              HIPAA Secure
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            {STEPS.map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const Icon = step.icon;
              
              return (
                <div key={step.id} className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors
                      ${isActive ? 'bg-primary text-primary-foreground border-primary' : 
                        isCompleted ? 'bg-primary/20 text-primary border-primary' : 
                        'bg-muted text-muted-foreground border-border'}
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="text-center mt-2">
                      <p className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-16 h-0.5 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="min-h-[400px]"
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center max-w-4xl mx-auto mt-8">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <div className="text-sm text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </div>
          
          <Button
            onClick={nextStep}
            disabled={currentStep === STEPS.length}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};