import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { usePageSEO } from '@/hooks/usePageSEO';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useSecureDiagnosis } from '@/hooks/useSecureDiagnosis';
import { SmartSymptomInput } from '@/components/wellness/SmartSymptomInput';
import { DoctorReviewPanel } from '@/components/wellness/DoctorReviewPanel';
import { DiagnosisResults } from '@/components/wellness/DiagnosisResults';
import { ConversationalDiagnosis } from '@/components/wellness/ConversationalDiagnosis';
import { ClarifyingQuestions } from '@/components/wellness/ClarifyingQuestions';
import { DrugRecommendations } from '@/components/wellness/DrugRecommendations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Shield, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  Clock, 
  Bookmark,
  X,
  Download,
  Share2,
  MessageCircle,
  Activity,
  Mail,
  Calendar,
  Stethoscope,
  Pill,
  CheckCircle,
  Target
} from 'lucide-react';
import Player from 'react-lottie-player';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Lottie Animation URLs
const DOCTOR_CONSULTATION_URL = 'https://lottie.host/95220-doctor-and-patient.json';
const HEARTBEAT_URL = 'https://lottie.host/99312-heart-beat.json';
const LOADING_MEDICAL_URL = 'https://lottie.host/74b1f-loading-medical.json';

const STEPS = [
  { id: 1, title: 'Enter Symptoms', description: 'Tell us what you\'re experiencing', icon: Stethoscope },
  { id: 2, title: 'Clarifying Questions', description: 'Help us understand better', icon: Target },
  { id: 3, title: 'AI Analysis', description: 'Review diagnosis results', icon: Brain },
  { id: 4, title: 'Medications', description: 'See recommended drugs', icon: Pill },
  { id: 5, title: 'Book Doctor', description: 'Connect with professionals', icon: Calendar }
];

interface ClarifyingQuestion {
  id: string;
  question: string;
  type: 'select' | 'text' | 'scale';
  options?: string[];
}

export const SystemAssessment = () => {
  usePageSEO({
    title: "Advanced AI Health Assessment - Smart Diagnostic Assistant | PrescriblyAI",
    description: "Experience our advanced diagnostic assistant with smart symptom input, AI analysis, drug recommendations, and instant doctor booking. Get professional healthcare guidance in minutes."
  });

  const { user } = useAuth();
  const { role } = useUserRole();
  const navigate = useNavigate();
  const { submitDiagnosis, loading: diagnosisLoading } = useSecureDiagnosis();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [diagnosisResults, setDiagnosisResults] = useState<any>(null);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [clarifyingAnswers, setClarifyingAnswers] = useState<Record<string, string>>({});
  const [drugRecommendations, setDrugRecommendations] = useState<Record<string, any>>({});
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [savedSessionData, setSavedSessionData] = useState<any>(null);
  const [loadingDrugs, setLoadingDrugs] = useState<Record<string, boolean>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showDrugModal, setShowDrugModal] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<{id: string, name: string} | null>(null);
  const { 
    saveSession, 
    checkForExistingSession, 
    clearSession, 
    setupAutoSave,
    isRestoring 
  } = useSessionManager('system-assessment');

  // Auto-save session when state changes
  const getCurrentState = () => ({
    currentStep,
    symptoms,
    diagnosisResults,
    clarifyingAnswers,
    drugRecommendations: [], 
    path: 'system-assessment'
  });

  // Save session when important state changes
  useEffect(() => {
    if (currentStep > 1 && user) {
      const timeoutId = setTimeout(() => {
        saveSession(getCurrentState());
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentStep, symptoms, diagnosisResults, clarifyingAnswers, saveSession, user]);

  // Setup auto-save on page unload
  useEffect(() => {
    return setupAutoSave(getCurrentState);
  }, [setupAutoSave]);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        setUserProfile(data);
      }
    };
    fetchUserProfile();
  }, [user]);

  // Check for existing sessions on mount
  useEffect(() => {
    const checkSessions = async () => {
      const sessionData = await checkForExistingSession();
      if (sessionData) {
        setSavedSessionData(sessionData);
        setShowRestorePrompt(true);
      }
    };

    if (user && currentStep === 1) {
      checkSessions();
    }
  }, [user, checkForExistingSession]);

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

  // Restore session data
  const restoreSession = (sessionData: any) => {
    if (sessionData) {
      setCurrentStep(sessionData.currentStep || 1);
      setSymptoms(sessionData.symptoms || []);
      setDiagnosisResults(sessionData.diagnosisResults || null);
      setClarifyingAnswers(sessionData.clarifyingAnswers || {});
      setDrugRecommendations({});
      setShowRestorePrompt(false);
      toast.success('Session restored successfully!');
    }
  };

  const handleSymptomSubmit = async (submittedSymptoms: string[]) => {
    setSymptoms(submittedSymptoms);
    
    // Generate clarifying questions based on symptoms
    const questions = generateClarifyingQuestions(submittedSymptoms);
    
    if (questions.length > 0) {
      setClarifyingQuestions(questions);
      setCurrentStep(2);
    } else {
      // Skip to diagnosis if no clarifying questions needed
      await runDiagnosis(submittedSymptoms);
    }
  };

  const handleDrugRecommendations = (conditionId: string, conditionName: string) => {
    setSelectedCondition({ id: conditionId, name: conditionName });
    setShowDrugModal(true);
  };

  const handleBookDoctor = (conditionId: string) => {
    navigate('/book-appointment', { 
      state: { 
        conditionId, 
        sessionId,
        referringPage: 'system-assessment' 
      } 
    });
  };

  const generateClarifyingQuestions = (symptoms: string[]): ClarifyingQuestion[] => {
    const questions: ClarifyingQuestion[] = [];
    
    symptoms.forEach(symptom => {
      const lowerSymptom = symptom.toLowerCase();
      
      if (lowerSymptom.includes('pain') || lowerSymptom.includes('headache')) {
        questions.push({
          id: 'pain_severity',
          question: 'How would you rate your pain on a scale of 1-10?',
          type: 'scale'
        });
        questions.push({
          id: 'pain_duration',
          question: 'How long have you been experiencing this pain?',
          type: 'select',
          options: ['Less than 1 hour', '1-6 hours', '6-24 hours', '1-3 days', 'More than 3 days']
        });
      }
      
      if (lowerSymptom.includes('fever')) {
        questions.push({
          id: 'fever_temp',
          question: 'What is your current temperature if measured?',
          type: 'text'
        });
        questions.push({
          id: 'fever_duration',
          question: 'When did the fever start?',
          type: 'select',
          options: ['Today', 'Yesterday', '2-3 days ago', 'More than 3 days ago']
        });
      }
      
      if (lowerSymptom.includes('cough')) {
        questions.push({
          id: 'cough_type',
          question: 'What type of cough do you have?',
          type: 'select',
          options: ['Dry cough', 'Productive cough with phlegm', 'Cough with blood']
        });
      }
    });
    
    // Remove duplicates
    return questions.filter((q, index, self) => 
      index === self.findIndex(question => question.id === q.id)
    );
  };

  const runDiagnosis = async (symptomsToAnalyze: string[]) => {
    try {
      const result = await submitDiagnosis({
        symptoms: symptomsToAnalyze,
        age: userProfile?.age || 30,
        gender: userProfile?.gender || 'unknown'
      });

      if (result.success) {
        if (result.emergency) {
          setDiagnosisResults({ 
            emergency: true, 
            message: result.message,
            warning: result.warning,
            emergencyNumbers: result.emergencyNumbers 
          });
        } else {
          setDiagnosisResults({ 
            diagnosis: result.diagnosis,
            sessionId: result.sessionId,
            red_flags: result.red_flags
          });
          setSessionId(result.sessionId || null);
        }
        setCurrentStep(3);
      }
    } catch (error) {
      console.error('Diagnosis error:', error);
      toast.error('An error occurred during analysis. Please try again.');
    }
  };

  const handleClarifyingSubmit = async () => {
    await runDiagnosis(symptoms);
  };

  const fetchDrugRecommendations = async (conditionName: string, conditionId?: string) => {
    const key = conditionId || conditionName;
    if (drugRecommendations[key]) return;

    setLoadingDrugs(prev => ({ ...prev, [key]: true }));
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) {
        toast.error('Please log in to continue');
        return;
      }

      // Use the recommend-drug edge function with condition ID
      const response = await fetch(`https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/recommend-drug/${conditionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.recommendations && data.recommendations.length > 0) {
          setDrugRecommendations(prev => ({ 
            ...prev, 
            [key]: data.recommendations 
          }));
          toast.success('Drug recommendations loaded successfully!');
        } else {
          // Handle case where no drugs are available
          setDrugRecommendations(prev => ({ 
            ...prev, 
            [key]: [] 
          }));
          toast.info(data.message || 'No drug recommendations available for this condition.');
        }
      } else {
        throw new Error('Failed to fetch drug recommendations');
      }
    } catch (error) {
      console.error('Failed to fetch drug recommendations:', error);
      toast.error('Failed to fetch drug recommendations');
    } finally {
      setLoadingDrugs(prev => ({ ...prev, [key]: false }));
    }
  };

  const saveDiagnosis = async () => {
    if (!sessionId || !diagnosisResults) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) {
        toast.error('Please log in to continue');
        return;
      }

      const response = await fetch(`https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/save-diagnosis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          diagnosis: diagnosisResults,
          symptoms
        })
      });

      if (response.ok) {
        toast.success('Diagnosis saved successfully!');
      } else {
        throw new Error('Failed to save diagnosis');
      }
    } catch (error) {
      console.error('Error saving diagnosis:', error);
      toast.error('Failed to save diagnosis');
    }
  };

  const generatePDF = async () => {
    const { jsPDF } = await import('jspdf');
    
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(59, 130, 246);
      pdf.text('PrescriblyAI', 20, 30);
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text('AI-Powered Healthcare Assessment Report', 20, 40);
      
      // Line separator
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, 45, pageWidth - 20, 45);
      
      let yPos = 60;
      
      // Patient Information
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('Patient Information', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      const patientName = userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'N/A';
      pdf.text(`Name: ${patientName}`, 20, yPos);
      yPos += 8;
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
      yPos += 8;
      pdf.text(`Time: ${new Date().toLocaleTimeString()}`, 20, yPos);
      yPos += 15;
      
      // Symptoms Section
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('Reported Symptoms', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      symptoms.forEach((symptom) => {
        pdf.text(`• ${symptom}`, 25, yPos);
        yPos += 7;
      });
      
      // Save the PDF
      const fileName = `PrescriblyAI_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.success('PDF report generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  const shareViaWhatsApp = () => {
    const patientName = userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'Patient';
    const timestamp = new Date().toLocaleString();
    
    let message = `PrescriblyAI Health Assessment Report\n\n`;
    message += `Patient: ${patientName}\n`;
    message += `Date: ${timestamp}\n\n`;
    
    message += `Symptoms Reported:\n`;
    symptoms.forEach(symptom => {
      message += `- ${symptom}\n`;
    });
    
    if (diagnosisResults?.diagnosis) {
      message += `\nDiagnosis Results:\n`;
      diagnosisResults.diagnosis.forEach((condition: any) => {
        message += `- ${condition.name} (${Math.round(condition.confidence * 100)}% probability)\n`;
      });
    }
    
    message += `\nImportant: Always consult a healthcare professional before taking any medication.\n\n`;
    message += `Generated by PrescriblyAI`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success('Shared successfully!');
  };

  const shareViaEmail = () => {
    const subject = 'My Diagnosis Result';
    const body = `Please find my AI health assessment results attached.`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
    toast.success('Shared successfully!');
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

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Restore Session Prompt */}
      <AnimatePresence>
        {showRestorePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border border-primary/20 rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Continue Previous Session
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRestorePrompt(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-muted-foreground mb-4">
                We found a previous assessment session. Would you like to continue where you left off?
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => restoreSession(savedSessionData)}
                  className="flex-1"
                >
                  Continue Session
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRestorePrompt(false)}
                  className="flex-1"
                >
                  Start New
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto max-w-4xl p-4">
        {/* Go to Dashboard Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end mb-4"
        >
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </motion.div>

        {/* Header with Lottie Animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="mx-auto mb-6 w-32 h-32">
            <Player
              play
              loop
              path={DOCTOR_CONSULTATION_URL}
              style={{ height: '128px', width: '128px' }}
            />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center justify-center gap-3">
            <Brain className="w-10 h-10 text-primary" />
            Advanced AI Diagnostic Assistant
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get professional-grade health assessments powered by advanced AI technology. 
            Analyze symptoms, receive drug recommendations, and connect with doctors instantly.
          </p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Assessment Progress</h3>
                <Badge variant="outline">
                  Step {currentStep} of {STEPS.length}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                {STEPS.map((step, index) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = false;
                  const isAccessible = true;
                  const Icon = step.icon;
                  
                  return (
                    <div key={step.id} className="flex flex-col items-center flex-1">
                      <button
                        onClick={() => goToStep(step.id)}
                        disabled={!isAccessible}
                        className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                          isCompleted 
                            ? 'bg-primary text-primary-foreground' 
                            : isActive 
                            ? 'bg-primary/20 text-primary border-2 border-primary' 
                            : isAccessible
                            ? 'bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer'
                            : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </button>
                      <div className="text-center">
                        <div className={`text-sm font-medium ${
                          isActive ? 'text-primary' : 
                          isAccessible ? 'text-muted-foreground' : 
                          'text-muted-foreground/50'
                        }`}>
                          {step.title}
                        </div>
                        <div className="text-xs text-muted-foreground hidden sm:block">
                          {step.description}
                        </div>
                      </div>
                      {index < STEPS.length - 1 && (
                        <div className={`absolute h-0.5 w-20 mt-5 ml-20 ${
                          isCompleted ? 'bg-primary' : 'bg-muted'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Loading Animation */}
        <AnimatePresence>
          {diagnosisLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            >
              <Card className="p-8 text-center">
                <CardContent>
                  <div className="mx-auto mb-4 w-24 h-24">
                    <Player
                      play
                      loop
                      path={LOADING_MEDICAL_URL}
                      style={{ height: '96px', width: '96px' }}
                    />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Analyzing your symptoms...</h3>
                  <p className="text-muted-foreground">
                    Our AI is processing your information to provide accurate results.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Step 1: Symptom Input */}
          {currentStep === 1 && (
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-6 w-6 text-primary" />
                  Enter Your Symptoms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SmartSymptomInput
                  onSymptomSubmit={handleSymptomSubmit}
                  isLoading={diagnosisLoading}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Clarifying Questions */}
          {currentStep === 2 && (
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-6 w-6 text-primary" />
                  Clarifying Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {clarifyingQuestions.map((question) => (
                  <div key={question.id} className="space-y-3">
                    <label className="text-sm font-medium">{question.question}</label>
                    {question.type === 'select' && question.options && (
                      <select 
                        value={clarifyingAnswers[question.id] || ''}
                        onChange={(e) => setClarifyingAnswers(prev => ({
                          ...prev,
                          [question.id]: e.target.value
                        }))}
                        className="w-full p-2 border border-primary/20 rounded-md"
                      >
                        <option value="">Select an option...</option>
                        {question.options.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    )}
                    {question.type === 'text' && (
                      <input
                        type="text"
                        value={clarifyingAnswers[question.id] || ''}
                        onChange={(e) => setClarifyingAnswers(prev => ({
                          ...prev,
                          [question.id]: e.target.value
                        }))}
                        className="w-full p-2 border border-primary/20 rounded-md"
                        placeholder="Enter your answer..."
                      />
                    )}
                    {question.type === 'scale' && (
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={clarifyingAnswers[question.id] || '5'}
                          onChange={(e) => setClarifyingAnswers(prev => ({
                            ...prev,
                            [question.id]: e.target.value
                          }))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1 (Mild)</span>
                          <span>5 (Moderate)</span>
                          <span>10 (Severe)</span>
                        </div>
                        <div className="text-center text-sm">
                          Current: {clarifyingAnswers[question.id] || '5'}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                <Button 
                  onClick={handleClarifyingSubmit}
                  className="w-full"
                  disabled={diagnosisLoading}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze Symptoms
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Diagnosis Results */}
          {currentStep === 3 && diagnosisResults && (
            <div className="space-y-6">
              {diagnosisResults.emergency ? (
                <Alert className="border-destructive bg-destructive/5">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    <strong>Emergency Detected:</strong> {diagnosisResults.message}
                    <div className="mt-2">
                      <Button variant="destructive" size="sm">
                        Call Emergency: {diagnosisResults.emergencyNumbers?.[0] || '911'}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Card className="border-primary/20 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-6 h-6">
                          <Player
                            play
                            loop
                            path={HEARTBEAT_URL}
                            style={{ height: '24px', width: '24px' }}
                          />
                        </div>
                        AI Diagnosis Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {diagnosisResults.diagnosis && Array.isArray(diagnosisResults.diagnosis) ? (
                        <div className="space-y-4">
                          {diagnosisResults.diagnosis.map((condition: any, index: number) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold">{condition.name}</h3>
                                <Badge variant={
                                  condition.confidence > 0.7 ? 'destructive' : 
                                  condition.confidence > 0.4 ? 'default' : 'secondary'
                                }>
                                  {Math.round(condition.confidence * 100)}%
                                </Badge>
                              </div>
                              <div className="mb-2">
                                <Progress value={condition.confidence * 100} className="h-2" />
                              </div>
                              {condition.explanation && (
                                <p className="text-sm text-muted-foreground">{condition.explanation}</p>
                              )}
                              <div className="mt-3 flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => fetchDrugRecommendations(condition.condition_name, condition.condition_id)}
                                  disabled={loadingDrugs[condition.condition_id]}
                                >
                                  <Pill className="h-4 w-4 mr-2" />
                                  {loadingDrugs[condition.condition_id] ? 'Loading...' : 'See Drugs'}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No diagnosis results available.</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Share Options */}
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Save & Share Your Results</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <Button onClick={generatePDF} variant="outline" className="w-full">
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                        <Button onClick={shareViaWhatsApp} variant="outline" className="w-full">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Share via WhatsApp
                        </Button>
                        <Button onClick={shareViaEmail} variant="outline" className="w-full">
                          <Mail className="h-4 w-4 mr-2" />
                          Share via Email
                        </Button>
                        <Button onClick={saveDiagnosis} className="w-full">
                          <Bookmark className="h-4 w-4 mr-2" />
                          Save Diagnosis
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Step 4: Drug Recommendations */}
          {currentStep === 4 && (
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-6 w-6 text-primary" />
                  Recommended Medications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(drugRecommendations).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(drugRecommendations).map(([condition, drugs]) => (
                      <div key={condition} className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-3">For {condition}:</h3>
                        <div className="space-y-3">
                          {Array.isArray(drugs) && drugs.map((drug: any, index: number) => (
                            <div key={index} className="bg-muted/50 p-3 rounded">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{drug.name}</h4>
                                <Badge variant="outline">{drug.form}</Badge>
                              </div>
                              <div className="text-sm space-y-1">
                                <p><strong>Strength:</strong> {drug.strength}</p>
                                <p><strong>Dosage:</strong> {drug.dosage}</p>
                                <p><strong>Frequency:</strong> {drug.frequency}</p>
                                <p><strong>Duration:</strong> {drug.duration}</p>
                                {drug.warnings && (
                                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                    <p className="text-yellow-800"><strong>⚠️ Warning:</strong> {drug.warnings}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Pill className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Go back to step 3 to view drug recommendations for your diagnosis.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 5: Book Doctor */}
          {currentStep === 5 && (
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-primary" />
                  Book a Doctor Consultation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-16 w-16 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Ready to consult with a doctor?</h3>
                  <p className="text-muted-foreground mb-6">
                    Connect with verified healthcare professionals who can review your AI assessment 
                    and provide personalized medical advice.
                  </p>
                  <Button 
                    size="lg"
                    onClick={() => navigate('/book-appointment', { 
                      state: { sessionId, symptoms, diagnosisResults } 
                    })}
                    className="mr-4"
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    Book Doctor Appointment
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => navigate('/dashboard')}>
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-between items-center mt-8"
        >
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
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
            {currentStep === STEPS.length ? 'Complete' : 'Next'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>

        {/* Medical Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Medical Disclaimer:</strong> This AI assessment is for informational purposes only 
              and should not replace professional medical advice, diagnosis, or treatment. 
              Always consult with a qualified healthcare provider for proper medical evaluation.
            </AlertDescription>
          </Alert>
        </motion.div>
      </div>
    </div>
  );
};

export default SystemAssessment;