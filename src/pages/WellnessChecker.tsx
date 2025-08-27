import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePageSEO } from '@/hooks/usePageSEO';
import { useTranslation } from 'react-i18next';
import { 
  Brain, 
  AlertTriangle,
  Loader2,
  ArrowRight,
  Bot,
  User,
  Stethoscope,
  Pill,
  Activity,
  Save,
  Calendar,
  FileDown,
  Bell,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { ProgressSteps } from '@/components/ai/ProgressSteps';
import { AdaptiveQuestionView, type AdaptiveQuestion } from '@/components/ai/AdaptiveQuestion';
import { BayesianResults } from '@/components/wellness/BayesianResults';
import { SymptomInput } from '@/components/wellness/SymptomInput';

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  isTyping?: boolean;
  component?: 'question' | 'diagnosis' | 'welcome';
}

interface UserProfile {
  age?: number;
  gender?: string;
  location?: string;
  medicalHistory?: string;
}

interface BayesianResult {
  condition: string;
  conditionId: number;
  probability: number;
  confidence: number;
  explanation: string;
  symptoms: string[];
  drugRecommendations: any[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface DiagnosisSession {
  sessionId: string;
  results: BayesianResult[];
  needsMoreInfo: boolean;
  nextQuestion?: AdaptiveQuestion;
  totalSymptoms: number;
}

const WellnessChecker = () => {
  const { t } = useTranslation();
  
  usePageSEO({
    title: `${t('wellness_checker')} - Prescribly`,
    description: "Chat with our AI diagnostic assistant for instant health analysis and personalized medical recommendations.",
    canonicalPath: "/wellness-checker"
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Enhanced state for Bayesian diagnosis
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps] = useState(8);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [currentQuestion, setCurrentQuestion] = useState<AdaptiveQuestion | null>(null);
  const [collectedSymptoms, setCollectedSymptoms] = useState<string[]>([]);
  const [diagnosisSession, setDiagnosisSession] = useState<DiagnosisSession | null>(null);
  const [chatPhase, setChatPhase] = useState<'welcome' | 'demographics' | 'symptoms' | 'diagnosis' | 'complete'>('welcome');
  const [sessionId] = useState(() => crypto.randomUUID());
  const [freeTextMode, setFreeTextMode] = useState(false);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize enhanced chat with welcome message
  useEffect(() => {
    setTimeout(() => {
      const welcomeMessage: ChatMessage = {
        id: '1',
        text: "Hi 👋, I'm Prescribly's Advanced Diagnostic Assistant. Speak to our AI to understand your symptoms better.",
        isBot: true,
        timestamp: new Date(),
        component: 'welcome'
      };
      setMessages([welcomeMessage]);
      
      setTimeout(() => {
        const optionMessage: ChatMessage = {
          id: '2',
          text: "How would you like to describe your symptoms?",
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, optionMessage]);
        showSymptomInputOptions();
      }, 1500);
    }, 500);
  }, []);

  // Show input method options
  const showSymptomInputOptions = () => {
    const question: AdaptiveQuestion = {
      id: 'input_method',
      text: 'Choose your preferred way to describe symptoms:',
      options: [
        { value: 'freetext', label: '💬 Describe freely (recommended)' },
        { value: 'guided', label: '🎯 Guided questions' },
        { value: 'quick', label: '⚡ Quick symptom picker' }
      ]
    };
    setCurrentQuestion(question);
  };

  // Show typing indicator
  const showTypingIndicator = () => {
    const typingMessage: ChatMessage = {
      id: `typing-${Date.now()}`,
      text: "...",
      isBot: true,
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);
  };

  const removeTypingIndicator = () => {
    setMessages(prev => prev.filter(msg => !msg.isTyping));
  };

  // Demographics collection
  const startDemographicsCollection = () => {
    setChatPhase('demographics');
    setCurrentStep(1);
    
    const question: AdaptiveQuestion = {
      id: 'age',
      text: 'First, could you tell me your age?',
      options: [
        { value: '18-25', label: '18-25 years' },
        { value: '26-35', label: '26-35 years' },
        { value: '36-50', label: '36-50 years' },
        { value: '50+', label: '50+ years' }
      ]
    };
    setCurrentQuestion(question);
  };

  const askGenderQuestion = () => {
    setTimeout(() => {
      const genderQuestion: AdaptiveQuestion = {
        id: 'gender',
        text: 'What is your gender?',
        options: [
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other', label: 'Other' },
          { value: 'prefer_not_to_say', label: 'Prefer not to say' }
        ]
      };
      setCurrentQuestion(genderQuestion);
    }, 1000);
  };

  const startQuickSymptomCollection = () => {
    setChatPhase('symptoms');
    const message: ChatMessage = {
      id: `bot-${Date.now()}`,
      text: "Select your symptoms from the quick picker below:",
      isBot: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  // Enhanced question handling with Bayesian logic
  const handleQuestionAnswer = async (value: string) => {
    if (!currentQuestion) return;

    // Add user response message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: value,
      isBot: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    if (currentQuestion.id === 'input_method') {
      setCurrentQuestion(null);
      setCurrentStep(1);
      
      if (value === 'freetext') {
        setFreeTextMode(true);
        startFreeTextCollection();
      } else if (value === 'guided') {
        startDemographicsCollection();
      } else {
        startQuickSymptomCollection();
      }
    } else if (currentQuestion.id === 'age') {
      setUserProfile(prev => ({ ...prev, age: parseInt(value.split('-')[0]) }));
      setCurrentStep(2);
      askGenderQuestion();
    } else if (currentQuestion.id === 'gender') {
      setUserProfile(prev => ({ ...prev, gender: value }));
      setCurrentStep(3);
      if (freeTextMode) {
        startFreeTextCollection();
      } else {
        startSymptomCollection();
      }
    } else if (currentQuestion.id.startsWith('question_')) {
      // Store the answer and continue with adaptive questioning
      setAnswers(prev => [...prev, value]);
      continueSymptomQuestions();
    }
  };

  // Start free text symptom collection
  const startFreeTextCollection = () => {
    setChatPhase('symptoms');
    const message: ChatMessage = {
      id: `bot-${Date.now()}`,
      text: "Please describe all your symptoms in detail. I'll use advanced NLP to understand and analyze them.",
      isBot: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  // Handle free text symptom input
  const handleSymptomSubmit = async (freeText: string, quickSymptoms: string[]) => {
    setIsLoading(true);
    
    try {
      // Call Bayesian diagnosis
      const { data, error } = await supabase.functions.invoke('bayesian-diagnosis', {
        body: {
          freeTextInput: freeText,
          symptoms: quickSymptoms.map(s => ({ text: s, confidence: 0.9 })),
          demographics: userProfile,
          sessionId
        }
      });

      if (error) throw error;

      setDiagnosisSession(data);
      
      if (data.needsMoreInfo && data.nextQuestion) {
        // Ask follow-up question
        setCurrentQuestion(data.nextQuestion);
        const followUpMessage: ChatMessage = {
          id: `bot-${Date.now()}`,
          text: "I need a bit more information to improve accuracy:",
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, followUpMessage]);
      } else {
        // Show results
        setChatPhase('diagnosis');
        const resultsMessage: ChatMessage = {
          id: `bot-${Date.now()}`,
          text: "Analysis complete! Here are your results based on Bayesian probability:",
          isBot: true,
          timestamp: new Date(),
          component: 'diagnosis'
        };
        setMessages(prev => [...prev, resultsMessage]);
      }
      
    } catch (error: any) {
      console.error('Diagnosis error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        text: "I'm having trouble processing your symptoms. Please try again or consult with a doctor directly.",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch diagnostic questions from Supabase
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  // Load diagnostic questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('diagnostic_questions')
          .select('*')
          .limit(15);
          
        if (error) throw error;
        if (data) {
          setDiagnosticQuestions(data);
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    };

    fetchQuestions();
  }, []);

  // Start symptom collection
  const startSymptomCollection = () => {
    setChatPhase('symptoms');
    setCurrentStep(4);
    
    showTypingIndicator();
    setTimeout(() => {
      removeTypingIndicator();
      const symptomMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        text: "Now, let's talk about your symptoms. I'll ask you a few specific questions.",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, symptomMessage]);
      
      setTimeout(() => {
        askNextQuestion();
      }, 1000);
    }, 1500);
  };

  // Ask next question from diagnostic questions
  const askNextQuestion = () => {
    if (currentQuestionIndex >= diagnosticQuestions.length || currentQuestionIndex >= 15) {
      // Proceed to diagnosis if we have 7+ answers
      if (answers.length >= 7) {
        performDiagnosis();
      }
      return;
    }

    const questionData = diagnosticQuestions[currentQuestionIndex];
    const question: AdaptiveQuestion = {
      id: `question_${questionData.id}`,
      text: questionData.question_text,
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
        { value: 'sometimes', label: 'Sometimes' }
      ]
    };
    setCurrentQuestion(question);
    setCurrentStep(5 + currentQuestionIndex);
  };

  // Continue with more questions
  const continueSymptomQuestions = () => {
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    
    // If we have at least 7 answers and reached question limit, or answered all questions
    if ((answers.length >= 7 && nextIndex >= 10) || nextIndex >= diagnosticQuestions.length) {
      setTimeout(() => {
        performDiagnosis();
      }, 1000);
    } else {
      setTimeout(() => {
        askNextQuestion();
      }, 1000);
    }
  };

  // Perform AI diagnosis using Supabase Edge Function
  const performDiagnosis = async () => {
    setChatPhase('diagnosis');
    setCurrentStep(10);
    
    showTypingIndicator();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication required');
      }

      // Call the diagnose edge function
      const { data, error } = await supabase.functions.invoke('diagnose', {
        body: {
          answers,
          age: userProfile.age || 25,
          gender: userProfile.gender || 'not specified'
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      removeTypingIndicator();
      
      if (data.condition) {
        // Create Bayesian result from edge function response
        const bayesianResult: BayesianResult = {
          condition: data.condition,
          conditionId: 0,
          probability: data.accuracy,
          confidence: data.accuracy,
          explanation: `Based on your answers, this condition matches ${data.accuracy}% of similar cases.`,
          symptoms: answers,
          drugRecommendations: data.drug ? [{
            drug: data.drug,
            dosage: 'As prescribed by doctor',
            usage: 'Follow medical advice'
          }] : [],
          riskLevel: data.accuracy > 90 ? 'high' : data.accuracy > 70 ? 'medium' : 'low'
        };
        
        setDiagnosisSession({
          sessionId,
          results: [bayesianResult],
          needsMoreInfo: false,
          totalSymptoms: answers.length
        });
        
        // Show diagnosis message
        setChatPhase('diagnosis');
        const diagnosisMessage: ChatMessage = {
          id: `diagnosis-${Date.now()}`,
          text: `Analysis complete! Here are your Bayesian results:`,
          isBot: true,
          timestamp: new Date(),
          component: 'diagnosis'
        };
        setMessages(prev => [...prev, diagnosisMessage]);
        
      } else if (data.message) {
        // No strong match found
        const noResultMessage: ChatMessage = {
          id: `no-diagnosis-${Date.now()}`,
          text: data.message,
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, noResultMessage]);
      }
      
      setChatPhase('complete');
      setCurrentStep(8);
      
    } catch (error) {
      console.error('Diagnosis error:', error);
      removeTypingIndicator();
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        text: "I'm having trouble processing your symptoms right now. Please try again or consult with a doctor directly.",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Save Bayesian results to Supabase
  const saveResults = async () => {
    if (!diagnosisSession) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to save your results.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.from('wellness_checks').insert({
        user_id: user.id,
        entered_symptoms: diagnosisSession.results[0]?.symptoms || [],
        calculated_probabilities: diagnosisSession.results.map(r => ({
          condition: r.condition,
          probability: r.probability
        })),
        suggested_drugs: diagnosisSession.results[0]?.drugRecommendations || [],
        age: userProfile.age || 25,
        gender: userProfile.gender || 'not specified',
        duration: 'recent'
      });

      if (error) throw error;

      toast({
        title: "Results Saved",
        description: "Your Bayesian diagnostic results have been saved successfully."
      });
      
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save results.",
        variant: "destructive"
      });
    }
  };

  const handleBookConsultation = () => {
    navigate('/book-appointment');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 relative overflow-hidden">
      {/* Background Medical Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <Stethoscope className="absolute top-20 left-10 w-16 h-16 text-primary animate-pulse" />
        <Pill className="absolute top-40 right-20 w-12 h-12 text-primary animate-pulse" />
        <Activity className="absolute bottom-40 left-20 w-20 h-20 text-primary animate-pulse" />
        <Brain className="absolute top-60 right-40 w-14 h-14 text-primary animate-pulse" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        {/* Enhanced Header */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 border border-primary/20">
              <div className="relative">
                <Brain className="h-8 w-8 text-primary" />
                <Sparkles className="h-3 w-3 text-primary/80 absolute -top-1 -right-1 animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Prescribly AI Diagnostics
              </h1>
              <p className="text-sm text-muted-foreground">Advanced probability-based health analysis</p>
            </div>
          </div>
          
          {/* Enhanced Progress Indicator */}
          {currentStep > 0 && (
            <div className="max-w-md mx-auto mb-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Step {currentStep} of {totalSteps}</span>
                <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
              </div>
              <ProgressSteps current={currentStep} total={totalSteps} />
            </div>
          )}
        </div>

        {/* Chat Container */}
        <Card className="h-[600px] flex flex-col border border-primary/10 shadow-lg overflow-hidden">
          {/* Enhanced Chat Header */}
          <div className="flex items-center gap-3 p-4 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="p-2 rounded-full bg-primary/10 border border-primary/20">
              <div className="relative">
                <Bot className="h-5 w-5 text-primary" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-primary flex items-center gap-2">
                Prescribly AI Assistant
                <Badge variant="secondary" className="text-xs">BETA</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">Advanced diagnostic reasoning • Online</p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                <div className={`flex items-start gap-3 max-w-[80%] ${message.isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                  {/* Avatar */}
                  <div className={`p-2 rounded-full flex-shrink-0 ${
                    message.isBot 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'bg-secondary/20 border border-secondary/30'
                  }`}>
                    {message.isBot ? (
                      <Bot className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-secondary-foreground" />
                    )}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                    message.isBot 
                      ? 'bg-primary/5 border border-primary/10 rounded-bl-md' 
                      : 'bg-primary text-primary-foreground rounded-br-md'
                  }`}>
                    {message.isTyping ? (
                      <div className="flex space-x-1 py-1">
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" />
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Current Question */}
            {currentQuestion && (
              <div className="animate-fade-in">
                <AdaptiveQuestionView 
                  question={currentQuestion}
                  onAnswer={handleQuestionAnswer}
                  disabled={isLoading}
                />
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Free Text Input for Symptoms */}
          {freeTextMode && chatPhase === 'symptoms' && !diagnosisSession && (
            <div className="p-4 border-t border-primary/10">
              <SymptomInput 
                onSymptomSubmit={handleSymptomSubmit}
                isLoading={isLoading}
              />
            </div>
          )}
        </Card>

        {/* Enhanced Bayesian Results */}
        {diagnosisSession?.results && (
          <div className="mt-6 animate-fade-in">
            <BayesianResults 
              results={diagnosisSession.results}
              onBookConsultation={handleBookConsultation}
              onSaveResults={saveResults}
            />
          </div>
        )}

        {/* Enhanced Analytics Display */}
        {diagnosisSession?.needsMoreInfo && diagnosisSession.nextQuestion && (
          <div className="mt-6 animate-fade-in">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Improving Analysis Accuracy
                  </span>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  I can provide a more accurate diagnosis with additional information:
                </p>
                <AdaptiveQuestionView 
                  question={diagnosisSession.nextQuestion}
                  onAnswer={handleQuestionAnswer}
                  disabled={isLoading}
                />
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Learning & Feedback Section */}
        {chatPhase === 'complete' && diagnosisSession && (
          <div className="mt-6 animate-fade-in">
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <span className="font-medium text-primary">Continuous Learning</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This diagnosis used advanced Bayesian inference with {diagnosisSession.totalSymptoms} symptoms 
                    and thousands of medical cases to provide the most accurate assessment.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default WellnessChecker;