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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { 
  Brain, 
  Shield, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  Target,
  Stethoscope,
  Pill,
  Calendar,
  Download,
  Share2,
  Loader2,
  AlertTriangle,
  AlertCircle
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

interface Medication {
  drug_name: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  form: string;
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
  const [medications, setMedications] = useState<Medication[]>([]);
  const [showMedications, setShowMedications] = useState(false);
  const [loadingMedications, setLoadingMedications] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
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
      setError('Failed to generate clarifying questions. Please try again.');
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
    setError(null);
    
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
          setError(data.error || 'No matching diagnosis could be made. Please consult a doctor.');
        }
      } else {
        throw new Error('Failed to perform diagnosis');
      }
    } catch (error) {
      console.error('Diagnosis error:', error);
      setError('No matching diagnosis could be made. Please consult a doctor.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMedications = async () => {
    if (!diagnosisResult) return;
    
    setLoadingMedications(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) {
        toast.error('Please log in to continue');
        return;
      }

      // Use condition name to fetch medications
      const response = await fetch(`https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/get_medications_with_condition?condition=${encodeURIComponent(diagnosisResult.condition)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.medications && data.medications.length > 0) {
          setMedications(data.medications);
          setShowMedications(true);
        } else {
          setError('No recommended drugs available. Please consult a doctor.');
        }
      } else {
        throw new Error('Failed to fetch medications');
      }
    } catch (error) {
      console.error('Error fetching medications:', error);
      setError('No recommended drugs available. Please consult a doctor.');
    } finally {
      setLoadingMedications(false);
    }
  };

  const getFormIcon = (form: string) => {
    const formLower = form.toLowerCase();
    if (formLower.includes('tablet') || formLower.includes('pill') || formLower.includes('capsule')) {
      return '💊';
    } else if (formLower.includes('injection') || formLower.includes('syringe')) {
      return '💉';
    } else if (formLower.includes('syrup') || formLower.includes('liquid')) {
      return '💧';
    }
    return '💊'; // default
  };

  const getRiskLevel = (probability: number) => {
    if (probability > 0.8) return { level: 'High Risk', color: 'destructive', icon: '🔴' };
    if (probability >= 0.5) return { level: 'Moderate Risk', color: 'default', icon: '🟡' };
    return { level: 'Low Risk', color: 'secondary', icon: '🟢' };
  };

  const downloadPDF = async () => {
    if (!diagnosisResult) return;
    
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      
      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(59, 130, 246);
      pdf.text('PrescriblyAI Diagnosis Report', 20, 30);
      
      // Patient info
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);
      
      // Diagnosis
      pdf.setFontSize(16);
      pdf.text('Diagnosis:', 20, 70);
      pdf.text(diagnosisResult.condition, 20, 85);
      pdf.setFontSize(12);
      pdf.text(`Probability: ${Math.round(diagnosisResult.probability * 100)}%`, 20, 95);
      
      // Explanation
      pdf.text('Explanation:', 20, 115);
      const splitExplanation = pdf.splitTextToSize(diagnosisResult.explanation, 170);
      pdf.text(splitExplanation, 20, 125);
      
      // Medications
      if (medications.length > 0) {
        let yPos = 155;
        pdf.text('Recommended Medications:', 20, yPos);
        yPos += 10;
        
        medications.forEach((med) => {
          pdf.text(`• ${med.drug_name} ${med.strength}`, 25, yPos);
          pdf.text(`  Dosage: ${med.dosage}, Frequency: ${med.frequency}`, 25, yPos + 8);
          yPos += 20;
        });
      }
      
      pdf.save(`PrescriblyAI_Diagnosis_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const shareViaWhatsApp = () => {
    if (!diagnosisResult) return;
    
    let message = `PrescriblyAI Diagnosis Report\n\n`;
    message += `Condition: ${diagnosisResult.condition}\n`;
    message += `Probability: ${Math.round(diagnosisResult.probability * 100)}%\n\n`;
    message += `Explanation: ${diagnosisResult.explanation}\n\n`;
    message += `Important: Always consult a healthcare professional before taking any medication.\n`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = () => {
    if (!diagnosisResult) return;
    
    const subject = `PrescriblyAI Diagnosis Report - ${diagnosisResult.condition}`;
    const body = `Please find my diagnosis report attached.\n\nCondition: ${diagnosisResult.condition}\nProbability: ${Math.round(diagnosisResult.probability * 100)}%`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
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
            
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {diagnosisResult && (
              <div className="space-y-6">
                {/* Main Diagnosis Card */}
                <Card className="max-w-2xl mx-auto overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <CheckCircle className="w-12 h-12 text-primary" />
                      <div>
                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                          {diagnosisResult.condition}
                        </CardTitle>
                        <p className="text-lg font-medium mt-2">
                          Likelihood: {Math.round(diagnosisResult.probability * 100)}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Progress 
                        value={diagnosisResult.probability * 100} 
                        className="w-full h-4"
                      />
                      
                      <Badge 
                        variant={getRiskLevel(diagnosisResult.probability).color as any}
                        className="text-sm px-3 py-1"
                      >
                        {getRiskLevel(diagnosisResult.probability).icon} {getRiskLevel(diagnosisResult.probability).level}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        Explanation
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">{diagnosisResult.explanation}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Recommendations</h3>
                      <ul className="space-y-3">
                        {diagnosisResult.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                      <Button 
                        onClick={fetchMedications}
                        disabled={loadingMedications}
                        className="flex items-center gap-2"
                        variant="default"
                      >
                        {loadingMedications ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Pill className="w-4 h-4" />
                        )}
                        See Drugs
                      </Button>
                      
                      <Button 
                        onClick={() => navigate('/book-appointment', { 
                          state: { sessionId, referringPage: 'system-assessment' } 
                        })}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Calendar className="w-4 h-4" />
                        Book Doctor
                      </Button>
                      
                      <Button 
                        onClick={downloadPDF}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Medications Section */}
                {showMedications && medications.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-2xl mx-auto"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Pill className="w-6 h-6 text-primary" />
                          Recommended Medications
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          For {diagnosisResult.condition}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Accordion type="single" collapsible className="w-full">
                          {medications.map((medication, index) => (
                            <AccordionItem key={index} value={`medication-${index}`}>
                              <AccordionTrigger className="text-left">
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">{getFormIcon(medication.form)}</span>
                                  <div>
                                    <div className="font-medium">{medication.drug_name}</div>
                                    <div className="text-sm text-muted-foreground">{medication.strength}</div>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">Dosage:</span>
                                    <p className="text-muted-foreground">{medication.dosage}</p>
                                  </div>
                                  <div>
                                    <span className="font-medium">Frequency:</span>
                                    <p className="text-muted-foreground">{medication.frequency}</p>
                                  </div>
                                  <div>
                                    <span className="font-medium">Duration:</span>
                                    <p className="text-muted-foreground">{medication.duration}</p>
                                  </div>
                                  <div>
                                    <span className="font-medium">Form:</span>
                                    <p className="text-muted-foreground">{medication.form}</p>
                                  </div>
                                </div>
                                <Alert className="mt-4 border-orange-200 bg-orange-50">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription className="text-orange-800">
                                    ⚠️ Consult a healthcare provider before use
                                  </AlertDescription>
                                </Alert>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                        
                        <div className="flex gap-3 pt-4">
                          <Button 
                            onClick={shareViaWhatsApp}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Share2 className="w-4 h-4" />
                            WhatsApp
                          </Button>
                          <Button 
                            onClick={shareViaEmail}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Share2 className="w-4 h-4" />
                            Email
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
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