import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useSecureDiagnosis } from '@/hooks/useSecureDiagnosis';
import { usePageSEO } from '@/hooks/usePageSEO';
import { SmartSymptomInput } from '@/components/wellness/SmartSymptomInput';
import { DiagnosisResults } from '@/components/wellness/DiagnosisResults';
import { DoctorReviewPanel } from '@/components/wellness/DoctorReviewPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, Shield, ChevronLeft, ChevronRight, Pill } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

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