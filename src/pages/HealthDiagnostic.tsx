import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { usePageSEO } from '@/hooks/usePageSEO';
import { useSessionManager } from '@/hooks/useSessionManager';
import { SymptomEntryScreen } from '@/components/diagnostic/SymptomEntryScreen';
import { ClarifyingQuestionsScreen } from '@/components/diagnostic/ClarifyingQuestionsScreen';
import { ChatStyleQuestionScreen } from '@/components/diagnostic/ChatStyleQuestionScreen';
import { DiagnosisResultScreen } from '@/components/diagnostic/DiagnosisResultScreen';
import { HistoryScreen } from '@/components/diagnostic/HistoryScreen';
import { Brain, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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

  // Restore session on load
  useEffect(() => {
    if (!user) return;

    const restoreSession = () => {
      try {
        const stored = localStorage.getItem(`diagnostic_session_${user.id}`);
        if (stored) {
          const session = JSON.parse(stored);
          if (session.currentStep) setCurrentStep(session.currentStep);
          if (session.symptoms) setSymptoms(session.symptoms);
          if (session.questions) setQuestions(session.questions);
          if (session.answers) setAnswers(session.answers);
          if (session.diagnosisResult) setDiagnosisResult(session.diagnosisResult);
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      }
    };

    restoreSession();
  }, [user]);

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

  const handleDiagnosisComplete = (result: any) => {
    setDiagnosisResult(result);
  };

  const handleViewHistory = () => {
    setCurrentStep('history');
  };

  const handleStartNewDiagnosis = () => {
    setCurrentStep('symptoms');
    setSymptoms([]);
    setQuestions([]);
    setAnswers({});
    setDiagnosisResult(null);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-accent/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-primary">AI Health Diagnostic</h1>
              <p className="text-lg text-primary/80 font-medium">Advanced Medical Analysis</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        {currentStep !== 'symptoms' && (
          <div className="max-w-4xl mx-auto mb-6">
            <Button 
              variant="outline" 
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        )}

        {/* Progress Steps */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {[
              { step: 'symptoms', label: 'Symptoms', number: 1 },
              { step: 'questions', label: 'Questions', number: 2 },
              { step: 'results', label: 'Results', number: 3 },
              { step: 'history', label: 'History', number: 4 }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
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
                  <div className={`w-12 h-0.5 mx-4 ${
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
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
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
  );
};

export default HealthDiagnostic;