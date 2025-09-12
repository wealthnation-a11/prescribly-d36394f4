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
import { Brain, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { id: 1, title: 'Enter Symptoms', description: 'Tell us what you\'re experiencing' },
  { id: 2, title: 'Clarifying Questions', description: 'Help us understand better' },
  { id: 3, title: 'AI Analysis', description: 'Get probable conditions' },
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
    
    // Check if we need clarifying questions BEFORE running diagnosis
    const needsClarification = submittedSymptoms.some(symptom => 
      symptom.toLowerCase().includes('fever') || 
      symptom.toLowerCase().includes('headache') ||
      symptom.toLowerCase().includes('pain') ||
      symptom.toLowerCase().includes('cough') ||
      symptom.toLowerCase().includes('nausea')
    );
    
    if (needsClarification) {
      setCurrentStep(2); // Go to clarifying questions first
      return;
    }

    // If no clarifying questions needed, proceed directly to diagnosis
    const result = await submitDiagnosis({
      symptoms: submittedSymptoms,
      severity: 3,
      duration: '2-3 days',
      age: 30,
      gender: 'unknown'
    });

    if (result.success) {
      if (result.emergency) {
        // Handle emergency case
        setDiagnosisResults(result);
        setCurrentStep(3); // Go to results
      } else if (result.diagnosis) {
        setDiagnosisResults(result);
        setCurrentStep(3); // Go to results
      }
    }
  };

  const handleClarifyingQuestions = () => {
    // Process clarifying answers and move to results
    setCurrentStep(3);
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

          {/* Step 4: Recommendations */}
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
                    <Shield className="h-5 w-5 text-primary" />
                    Treatment Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Based on your diagnosis, here are our recommended next steps:
                  </p>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Immediate Care</h4>
                      <p className="text-sm text-muted-foreground">
                        Rest, stay hydrated, and monitor your symptoms.
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Professional Consultation</h4>
                      <p className="text-sm text-muted-foreground">
                        We recommend booking an appointment with a qualified doctor for proper treatment.
                      </p>
                    </div>
                  </div>
                  
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