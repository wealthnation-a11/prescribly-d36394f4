import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { usePageSEO } from '@/hooks/usePageSEO';
import { useSessionManager } from '@/hooks/useSessionManager';
import { SymptomEntryScreen } from '@/components/diagnostic/SymptomEntryScreen';
import { ClarifyingQuestionsScreen } from '@/components/diagnostic/ClarifyingQuestionsScreen';
import { ChatStyleQuestionScreen } from '@/components/diagnostic/ChatStyleQuestionScreen';
import { DiagnosisResultScreen } from '@/components/diagnostic/DiagnosisResultScreen';
import { HistoryScreen } from '@/components/diagnostic/HistoryScreen';
import { Brain, ArrowLeft, X, RefreshCw, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export type DiagnosticStep = 'symptoms' | 'questions' | 'results' | 'history';

interface DiagnosticSessionData {
  currentStep: DiagnosticStep;
  symptoms: string[];
  questions: any[];
  answers: Record<string, string>;
  diagnosisResult: any;
}

const HealthDiagnostic = () => {
  usePageSEO({
    title: "AI Health Diagnostic - Prescribly",
    description: "Advanced AI-powered health diagnostic system with symptom analysis and medical recommendations.",
    canonicalPath: "/health-diagnostic"
  });

  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<DiagnosticStep>('symptoms');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [savedSession, setSavedSession] = useState<any>(null);

  // Save session data manually - we'll implement a simpler approach
  const saveCurrentSession = () => {
    if (!user) return;
    
    const sessionData = {
      currentStep,
      symptoms,
      questions,
      answers,
      diagnosisResult,
      path: 'health-diagnostic'
    };
    
    // Store in localStorage for now since session manager has type issues
    localStorage.setItem(`diagnostic_session_${user.id}`, JSON.stringify(sessionData));
  };

  // Check for saved session on load
  useEffect(() => {
    if (!user) return;

    const checkSavedSession = () => {
      try {
        const stored = localStorage.getItem(`diagnostic_session_${user.id}`);
        if (stored) {
          const session = JSON.parse(stored);
          // Only show dialog if there's meaningful progress
          if (session.currentStep && session.currentStep !== 'symptoms') {
            setSavedSession(session);
            setShowSessionDialog(true);
          }
        }
      } catch (error) {
        console.error('Error checking saved session:', error);
      }
    };

    checkSavedSession();
  }, [user]);

  const restoreSession = () => {
    if (savedSession) {
      setCurrentStep(savedSession.currentStep);
      setSymptoms(savedSession.symptoms || []);
      setQuestions(savedSession.questions || []);
      setAnswers(savedSession.answers || {});
      setDiagnosisResult(savedSession.diagnosisResult);
    }
    setShowSessionDialog(false);
  };

  const startFresh = () => {
    // Clear saved session and start fresh
    if (user) {
      localStorage.removeItem(`diagnostic_session_${user.id}`);
    }
    setCurrentStep('symptoms');
    setSymptoms([]);
    setQuestions([]);
    setAnswers({});
    setDiagnosisResult(null);
    setShowSessionDialog(false);
  };

  // Save session whenever data changes
  useEffect(() => {
    if (user) {
      saveCurrentSession();
    }
  }, [currentStep, symptoms, questions, answers, diagnosisResult, user]);

  const handleSymptomsSubmit = (selectedSymptoms: string[]) => {
    setSymptoms(selectedSymptoms);
    setCurrentStep('questions');
  };

  const handleQuestionsSubmit = (questionsList: any[], answersData: Record<string, string>) => {
    setQuestions(questionsList);
    setAnswers(answersData);
    setCurrentStep('results');
  };

  const handleDiagnosisComplete = useCallback((result: any) => {
    setDiagnosisResult(result);
  }, []);

  const handleViewHistory = useCallback(() => {
    setCurrentStep('history');
  }, []);

  const handleStartNewDiagnosis = useCallback(() => {
    setCurrentStep('symptoms');
    setSymptoms([]);
    setQuestions([]);
    setAnswers({});
    setDiagnosisResult(null);
  }, []);

  const handleBack = () => {
    switch (currentStep) {
      case 'questions':
        setCurrentStep('symptoms');
        break;
      case 'results':
        setCurrentStep('questions');
        break;
      case 'history':
        setCurrentStep('symptoms');
        break;
    }
  };


  return (
    <>
      {/* Session Restoration Dialog */}
      <AlertDialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Continue Previous Session?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              You have an incomplete health diagnostic session. Would you like to continue where you left off or start a new assessment?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={startFresh} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Start New
            </AlertDialogCancel>
            <AlertDialogAction onClick={restoreSession} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Continue Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-primary">Health Diagnostic</h1>
                <p className="text-lg text-primary/80 font-medium">Advanced Medical Analysis</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          {currentStep !== 'symptoms' && (
            <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button 
                variant="ghost" 
                onClick={startFresh}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                size="sm"
              >
                <X className="h-4 w-4" />
                Cancel & Restart
              </Button>
            </div>
          )}

          {/* Progress Steps */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              {[
                { step: 'symptoms', label: 'Symptoms', number: 1 },
                { step: 'questions', label: 'Questions', number: 2 },
                { step: 'results', label: 'Results', number: 3 },
                { step: 'history', label: 'History', number: 4 }
              ].map((item, index) => (
                <div key={item.step} className="flex items-center flex-shrink-0">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                    ${currentStep === item.step 
                      ? 'bg-primary text-white' 
                      : index < ['symptoms', 'questions', 'results', 'history'].indexOf(currentStep)
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                    }
                  `}>
                    {item.number}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    currentStep === item.step ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {item.label}
                  </span>
                  {index < 3 && (
                    <div className={`w-8 sm:w-12 h-0.5 mx-2 sm:mx-4 ${
                      index < ['symptoms', 'questions', 'results', 'history'].indexOf(currentStep)
                        ? 'bg-green-500'
                        : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Screen Content */}
          <div className="max-w-4xl mx-auto">
            <div className="">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="pb-6"
                >
                  {currentStep === 'symptoms' && (
                    <SymptomEntryScreen
                      onSubmit={handleSymptomsSubmit}
                      onViewHistory={handleViewHistory}
                      loading={loading}
                    />
                  )}

                  {currentStep === 'questions' && (
                    <ChatStyleQuestionScreen
                      symptoms={symptoms}
                      onSubmit={handleQuestionsSubmit}
                      loading={loading}
                    />
                  )}

                  {currentStep === 'results' && (
                    <DiagnosisResultScreen
                      symptoms={symptoms}
                      answers={answers}
                      onComplete={handleDiagnosisComplete}
                      onViewHistory={handleViewHistory}
                      onStartNew={handleStartNewDiagnosis}
                    />
                  )}

                  {currentStep === 'history' && (
                    <HistoryScreen
                      onStartNew={handleStartNewDiagnosis}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HealthDiagnostic;