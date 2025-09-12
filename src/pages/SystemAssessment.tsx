import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useSecureDiagnosis } from '@/hooks/useSecureDiagnosis';
import { usePageSEO } from '@/hooks/usePageSEO';
import { useSessionManager } from '@/hooks/useSessionManager';
import { SmartSymptomInput } from '@/components/wellness/SmartSymptomInput';
import { DiagnosisResults } from '@/components/wellness/DiagnosisResults';
import { DoctorReviewPanel } from '@/components/wellness/DoctorReviewPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, Shield, ChevronLeft, ChevronRight, Pill, Download, Share, Mail, RotateCcw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

const STEPS = [
  { id: 1, title: 'Enter Symptoms', description: 'Tell us what you\'re experiencing' },
  { id: 2, title: 'Clarifying Questions', description: 'Help us understand better' },
  { id: 3, title: 'Analysis', description: 'Review diagnosis results' },
  { id: 4, title: 'Recommendations', description: 'View suggested treatments' },
  { id: 5, title: 'Book Doctor', description: 'Connect with healthcare professionals' }
];

export const SystemAssessment = () => {
  usePageSEO({
    title: "Advanced AI Health Assessment - Smart Diagnostic Assistant | PrescriblyAI",
    description: "Experience our advanced diagnostic assistant with smart symptom input, AI analysis, drug recommendations, and instant doctor booking. Get professional healthcare guidance in minutes."
  });

  const { user } = useAuth();
  const { role } = useUserRole();
  const navigate = useNavigate();
  const { loading, submitDiagnosis, lastDiagnosisId } = useSecureDiagnosis();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [diagnosisResults, setDiagnosisResults] = useState<any>(null);
  const [clarifyingAnswers, setClarifyingAnswers] = useState<Record<string, string>>({});
  const [drugRecommendations, setDrugRecommendations] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [savedSessionData, setSavedSessionData] = useState<any>(null);

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
    drugRecommendations,
    path: 'system-assessment'
  });

  // Save session when important state changes
  useEffect(() => {
    if (currentStep > 1 && user) {
      const timeoutId = setTimeout(() => {
        saveSession(getCurrentState());
      }, 1000); // Debounce saves
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentStep, symptoms, diagnosisResults, clarifyingAnswers, drugRecommendations, saveSession, user]);

  // Setup auto-save on page unload
  useEffect(() => {
    return setupAutoSave(getCurrentState);
  }, [setupAutoSave]);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const sessionData = await checkForExistingSession();
      if (sessionData && sessionData.currentStep > 1) {
        setSavedSessionData(sessionData);
        setShowRestorePrompt(true);
      }
    };

    if (user && currentStep === 1) {
      checkSession();
    }
  }, [user, checkForExistingSession]);

  // Restore session data
  const restoreSession = () => {
    if (savedSessionData) {
      setCurrentStep(savedSessionData.currentStep || 1);
      setSymptoms(savedSessionData.symptoms || []);
      setDiagnosisResults(savedSessionData.diagnosisResults || null);
      setClarifyingAnswers(savedSessionData.clarifyingAnswers || {});
      setDrugRecommendations(savedSessionData.drugRecommendations || []);
      setShowRestorePrompt(false);
      toast.success('Session restored successfully!');
    }
  };

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
    
    // Check if we need clarifying questions
    const needsClarification = submittedSymptoms.some(symptom => 
      symptom.toLowerCase().includes('fever') || 
      symptom.toLowerCase().includes('headache') ||
      symptom.toLowerCase().includes('pain') ||
      symptom.toLowerCase().includes('cough') ||
      symptom.toLowerCase().includes('nausea')
    );
    
    if (needsClarification) {
      setCurrentStep(2); // Go to clarifying questions first
    } else {
      // If no clarifying questions needed, run diagnosis and go to step 3
      await runDiagnosis(submittedSymptoms);
    }
  };

  const runDiagnosis = async (symptomsToAnalyze: string[]) => {
    const result = await submitDiagnosis({
      symptoms: symptomsToAnalyze,
      severity: 3,
      duration: '2-3 days',
      age: 30,
      gender: 'unknown'
    });

    if (result.success) {
      if (result.emergency) {
        setDiagnosisResults(result);
        setCurrentStep(3); // Go to analysis
      } else if (result.diagnosis) {
        setDiagnosisResults(result);
        // Fetch drug recommendations based on symptoms
        await fetchDrugRecommendations(symptomsToAnalyze);
        setCurrentStep(3); // Go to analysis
      }
    }
  };

  const fetchDrugRecommendations = async (symptoms: string[]) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) return;

      const response = await fetch(`https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/drug-recommendations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symptoms })
      });

      if (response.ok) {
        const data = await response.json();
        setDrugRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Failed to fetch drug recommendations:', error);
      setDrugRecommendations([]);
    }
  };

  const handleClarifyingQuestions = async () => {
    // After clarifying questions, run diagnosis with the symptoms
    await runDiagnosis(symptoms);
  };

  const generatePDF = async () => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Add Prescribly logo/header
      pdf.setFontSize(20);
      pdf.setTextColor(59, 130, 246); // Primary blue
      pdf.text('PrescriblyAI', 20, 30);
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text('AI-Powered Healthcare Assessment Report', 20, 40);
      
      // Add line separator
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
      symptoms.forEach((symptom, index) => {
        pdf.text(`• ${symptom}`, 25, yPos);
        yPos += 7;
      });
      yPos += 10;
      
      // AI Analysis Section
      if (diagnosisResults?.diagnosis && Array.isArray(diagnosisResults.diagnosis)) {
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('AI Analysis Results', 20, yPos);
        yPos += 10;
        
        diagnosisResults.diagnosis.forEach((condition: any, index: number) => {
          pdf.setFontSize(11);
          pdf.setFont(undefined, 'bold');
          pdf.text(`${index + 1}. ${condition.name}`, 25, yPos);
          yPos += 8;
          
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'normal');
          if (condition.confidence) {
            pdf.text(`   Probability: ${Math.round(condition.confidence * 100)}%`, 25, yPos);
            yPos += 6;
          }
          if (condition.icd10) {
            pdf.text(`   ICD-10: ${condition.icd10}`, 25, yPos);
            yPos += 6;
          }
          yPos += 5;
        });
      }
      
      // Drug Recommendations Section
      if (drugRecommendations.length > 0) {
        yPos += 5;
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Recommended Medications', 20, yPos);
        yPos += 10;
        
        drugRecommendations.forEach((drug, index) => {
          // Check if we need a new page
          if (yPos > pageHeight - 40) {
            pdf.addPage();
            yPos = 30;
          }
          
          pdf.setFontSize(11);
          pdf.setFont(undefined, 'bold');
          pdf.text(`${index + 1}. ${drug.name}`, 25, yPos);
          yPos += 8;
          
          pdf.setFontSize(9);
          pdf.setFont(undefined, 'normal');
          
          if (drug.strength) {
            pdf.text(`   Strength: ${drug.strength}`, 25, yPos);
            yPos += 5;
          }
          if (drug.dosage) {
            pdf.text(`   Dosage: ${drug.dosage}`, 25, yPos);
            yPos += 5;
          }
          if (drug.frequency) {
            pdf.text(`   Frequency: ${drug.frequency}`, 25, yPos);
            yPos += 5;
          }
          if (drug.duration) {
            pdf.text(`   Duration: ${drug.duration}`, 25, yPos);
            yPos += 5;
          }
          if (drug.rxnorm_code) {
            pdf.text(`   RxNorm ID: ${drug.rxnorm_code}`, 25, yPos);
            yPos += 5;
          }
          if (drug.warnings) {
            pdf.setTextColor(220, 38, 38); // Red for warnings
            pdf.text(`   ⚠️ Warning: ${drug.warnings}`, 25, yPos);
            pdf.setTextColor(0, 0, 0); // Reset to black
            yPos += 5;
          }
          yPos += 8;
        });
      }
      
      // Footer/Disclaimer
      yPos = pageHeight - 30;
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('IMPORTANT: This report is AI-generated for informational purposes only.', 20, yPos);
      yPos += 5;
      pdf.text('Always consult with a qualified healthcare professional before taking any medication.', 20, yPos);
      yPos += 5;
      pdf.text(`Generated by PrescriblyAI on ${new Date().toLocaleString()}`, 20, yPos);
      
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
    
    let message = `*PrescriblyAI Health Assessment Report*\n\n`;
    message += `👤 Patient: ${patientName}\n`;
    message += `📅 Date: ${timestamp}\n\n`;
    
    message += `🔍 *Symptoms Reported:*\n`;
    symptoms.forEach(symptom => {
      message += `• ${symptom}\n`;
    });
    
    if (diagnosisResults?.diagnosis && Array.isArray(diagnosisResults.diagnosis)) {
      message += `\n🧠 *AI Analysis:*\n`;
      diagnosisResults.diagnosis.slice(0, 3).forEach((condition: any, index: number) => {
        const probability = condition.confidence ? ` (${Math.round(condition.confidence * 100)}%)` : '';
        message += `${index + 1}. ${condition.name}${probability}\n`;
      });
    }
    
    if (drugRecommendations.length > 0) {
      message += `\n💊 *Top Recommended Medications:*\n`;
      drugRecommendations.slice(0, 3).forEach((drug, index) => {
        message += `${index + 1}. ${drug.name}`;
        if (drug.strength) message += ` - ${drug.strength}`;
        message += `\n`;
      });
    }
    
    message += `\n⚠️ *Important:* Always consult a healthcare professional before taking any medication.\n\n`;
    message += `Generated by PrescriblyAI`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = () => {
    const patientName = userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'Patient';
    const timestamp = new Date().toLocaleString();
    
    const subject = `PrescriblyAI Health Assessment Report - ${patientName}`;
    
    let body = `PrescriblyAI Health Assessment Report\n\n`;
    body += `Patient: ${patientName}\n`;
    body += `Date: ${timestamp}\n\n`;
    
    body += `Symptoms Reported:\n`;
    symptoms.forEach(symptom => {
      body += `• ${symptom}\n`;
    });
    
    if (diagnosisResults?.diagnosis && Array.isArray(diagnosisResults.diagnosis)) {
      body += `\nAI Analysis Results:\n`;
      diagnosisResults.diagnosis.forEach((condition: any, index: number) => {
        const probability = condition.confidence ? ` (${Math.round(condition.confidence * 100)}% probability)` : '';
        body += `${index + 1}. ${condition.name}${probability}\n`;
        if (condition.icd10) body += `   ICD-10: ${condition.icd10}\n`;
      });
    }
    
    if (drugRecommendations.length > 0) {
      body += `\nRecommended Medications:\n`;
      drugRecommendations.forEach((drug, index) => {
        body += `${index + 1}. ${drug.name}\n`;
        if (drug.strength) body += `   Strength: ${drug.strength}\n`;
        if (drug.dosage) body += `   Dosage: ${drug.dosage}\n`;
        if (drug.frequency) body += `   Frequency: ${drug.frequency}\n`;
        if (drug.duration) body += `   Duration: ${drug.duration}\n`;
        if (drug.rxnorm_code) body += `   RxNorm ID: ${drug.rxnorm_code}\n`;
        if (drug.warnings) body += `   ⚠️ Warning: ${drug.warnings}\n`;
        body += `\n`;
      });
    }
    
    body += `IMPORTANT DISCLAIMER:\n`;
    body += `This report is AI-generated for informational purposes only. Always consult with a qualified healthcare professional before taking any medication or making health decisions.\n\n`;
    body += `Generated by PrescriblyAI on ${timestamp}`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const handleBookDoctor = () => {
    navigate('/book-appointment', {
      state: { 
        sessionId: lastDiagnosisId,
        symptoms,
        diagnosisResults 
      }
    });
  };

  const handleNextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  const renderClarifyingQuestions = () => {
    const questions = [];
    
    if (symptoms.some(s => s.toLowerCase().includes('fever'))) {
      questions.push({
        id: 'fever_duration',
        question: 'How long have you had the fever?',
        options: ['Less than 24 hours', '1-2 days', '3-5 days', 'More than a week']
      });
    }
    
    if (symptoms.some(s => s.toLowerCase().includes('headache'))) {
      questions.push({
        id: 'headache_intensity',
        question: 'How would you rate your headache intensity?',
        options: ['Mild', 'Moderate', 'Severe', 'Unbearable']
      });
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Clarifying Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((q) => (
              <div key={q.id} className="space-y-3">
                <h4 className="font-medium">{q.question}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((option) => (
                    <Button
                      key={option}
                      variant={clarifyingAnswers[q.id] === option ? "default" : "outline"}
                      onClick={() => setClarifyingAnswers(prev => ({ ...prev, [q.id]: option }))}
                      className="text-left justify-start"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            
            <Button 
              onClick={handleClarifyingQuestions}
              className="w-full mt-6"
              disabled={questions.some(q => !clarifyingAnswers[q.id])}
            >
              Continue to Analysis
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Session Restore Prompt */}
        {showRestorePrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <Card className="max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-primary" />
                  Continue Previous Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  We found an incomplete assessment from your previous session. Would you like to continue where you left off?
                </p>
                {savedSessionData && (
                  <div className="bg-secondary/20 rounded-lg p-3 mb-4 text-sm">
                    <p><strong>Step:</strong> {savedSessionData.currentStep} of 5</p>
                    <p><strong>Symptoms:</strong> {savedSessionData.symptoms?.length || 0} entered</p>
                    <p><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRestorePrompt(false);
                      clearSession();
                    }}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Start Fresh
                  </Button>
                  <Button
                    onClick={restoreSession}
                    className="flex-1 flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Continue Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-foreground mb-2 flex items-center justify-center gap-3"
          >
            <Brain className="w-10 h-10 text-primary" />
            Advanced Diagnostic Assistant
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg"
          >
            Smart symptom analysis with AI-powered recommendations
          </motion.p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.title}
            </h2>
            <div className="text-sm text-muted-foreground">
              {Math.round(progressPercentage)}% Complete
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          
          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step) => (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    currentStep >= step.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.id}
                </div>
                <div className="text-xs text-center mt-1 max-w-20">
                  <div className="font-medium">{step.title}</div>
                  <div className="text-muted-foreground">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Symptom Input */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <SmartSymptomInput
                onSymptomSubmit={handleSymptomSubmit}
                isLoading={loading}
              />
            </motion.div>
          )}

          {/* Step 2: Clarifying Questions */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {renderClarifyingQuestions()}
            </motion.div>
          )}

          {/* Step 3: Diagnosis Results */}
          {currentStep === 3 && diagnosisResults && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI Diagnosis Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {diagnosisResults?.diagnosis ? (
                    <div className="space-y-4">
                      {diagnosisResults.diagnosis.map((condition: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{condition.condition}</h4>
                            <Badge variant="outline">
                              {Math.round(condition.probability * 100)}% match
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{condition.explanation}</p>
                          <Progress value={condition.probability * 100} className="h-2" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No diagnosis results available.</p>
                  )}
                  
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={handlePreviousStep}>
                      Previous
                    </Button>
                    <Button onClick={handleNextStep} className="flex-1">
                      Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Drug Recommendations */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-primary" />
                    Drug Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Based on your symptoms and analysis, here are the recommended medications:
                  </p>
                  
                  {drugRecommendations.length > 0 ? (
                    <div className="space-y-4">
                      {drugRecommendations.map((drug, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{drug.name}</h4>
                            <Badge variant="outline">{drug.form || 'Tablet'}</Badge>
                          </div>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            {drug.strength && (
                              <p><span className="font-medium">Strength:</span> {drug.strength}</p>
                            )}
                            {drug.dosage && (
                              <p><span className="font-medium">Dosage:</span> {drug.dosage}</p>
                            )}
                            {drug.frequency && (
                              <p><span className="font-medium">Frequency:</span> {drug.frequency}</p>
                            )}
                            {drug.duration && (
                              <p><span className="font-medium">Duration:</span> {drug.duration}</p>
                            )}
                            {drug.rxnorm_code && (
                              <p><span className="font-medium">RxNorm ID:</span> {drug.rxnorm_code}</p>
                            )}
                          </div>
                          {drug.warnings && (
                            <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded">
                              <p className="text-xs font-medium text-destructive">⚠️ Warning:</p>
                              <p className="text-xs text-destructive">{drug.warnings}</p>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <h4 className="font-medium text-primary mb-2">Important Notice</h4>
                        <p className="text-sm text-muted-foreground">
                          These are AI-generated recommendations based on your symptoms. Always consult with a qualified healthcare professional before taking any medication.
                        </p>
                      </div>

                      {/* Sharing Options */}
                      <div className="mt-6 p-4 border border-border rounded-lg bg-secondary/20">
                        <h4 className="font-medium mb-3">Share & Export Options</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={generatePDF}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download PDF
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={shareViaWhatsApp}
                            className="flex items-center gap-2 text-green-600 hover:text-green-700"
                          >
                            <Share className="h-4 w-4" />
                            Share WhatsApp
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={shareViaEmail}
                            className="flex items-center gap-2"
                          >
                            <Mail className="h-4 w-4" />
                            Share Email
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 text-center">
                        <h4 className="font-medium mb-2">No specific drugs available</h4>
                        <p className="text-sm text-muted-foreground">
                          Please consult with a qualified doctor for proper treatment recommendations.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3 mt-6">
                    <Button 
                      variant="outline" 
                      onClick={handlePreviousStep}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button onClick={handleNextStep} className="flex-1">
                      Continue to Booking
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 5: Book Doctor */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Connect with a Doctor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    Your diagnostic session is complete. Book an appointment with a qualified healthcare professional 
                    to discuss your results and get personalized treatment.
                  </p>
                  
                  <div className="bg-primary/5 rounded-lg p-4 mb-6">
                    <h4 className="font-medium mb-2">What you'll get:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Professional medical consultation</li>
                      <li>• Review of your AI assessment</li>
                      <li>• Personalized treatment plan</li>
                      <li>• Prescription if needed</li>
                      <li>• Follow-up recommendations</li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={handlePreviousStep}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button onClick={handleBookDoctor} className="flex-1">
                      Book Doctor Appointment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Footer */}
        {currentStep > 1 && currentStep < 5 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-between mt-8"
          >
            <Button 
              variant="outline" 
              onClick={handlePreviousStep}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Step
            </Button>
            
            {currentStep < 4 && (
              <Button 
                onClick={handleNextStep}
                className="flex items-center gap-2"
                disabled={currentStep === 1 && symptoms.length === 0}
              >
                Next Step
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};