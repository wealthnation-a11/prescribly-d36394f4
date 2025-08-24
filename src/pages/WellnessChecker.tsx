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
  Bell
} from 'lucide-react';
import { ProgressSteps } from '@/components/ai/ProgressSteps';
import { AdaptiveQuestionView, type AdaptiveQuestion } from '@/components/ai/AdaptiveQuestion';
import { DiagnosisResults, type Diagnosis } from '@/components/ai/DiagnosisResults';

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

interface DiagnosisResult {
  condition: string;
  confidence: number;
  icd10?: string;
  explanation: string;
  drugs: Array<{
    name: string;
    dosage: string;
    usage: string;
  }>;
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

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps] = useState(12);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [currentQuestion, setCurrentQuestion] = useState<AdaptiveQuestion | null>(null);
  const [collectedSymptoms, setCollectedSymptoms] = useState<string[]>([]);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [chatPhase, setChatPhase] = useState<'welcome' | 'demographics' | 'symptoms' | 'diagnosis' | 'complete'>('welcome');

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat with welcome message
  useEffect(() => {
    setTimeout(() => {
      const welcomeMessage: ChatMessage = {
        id: '1',
        text: "Hi 👋, I'm Prescribly. Let's check your health in a few quick steps.",
        isBot: true,
        timestamp: new Date(),
        component: 'welcome'
      };
      setMessages([welcomeMessage]);
      
      setTimeout(() => {
        startDemographicsCollection();
      }, 1500);
    }, 500);
  }, []);

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

  // Handle question answers
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

    // Update user profile or symptoms based on current question
    if (currentQuestion.id === 'age') {
      setUserProfile(prev => ({ ...prev, age: parseInt(value.split('-')[0]) }));
      setCurrentStep(2);
      
      // Ask gender next
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
      
    } else if (currentQuestion.id === 'gender') {
      setUserProfile(prev => ({ ...prev, gender: value }));
      setCurrentStep(3);
      
      // Start symptom collection
      setTimeout(() => {
        startSymptomCollection();
      }, 1000);
      
    } else if (currentQuestion.id.startsWith('symptom_')) {
      if (value === 'yes') {
        const symptom = currentQuestion.text.toLowerCase().includes('pain') ? 'pain' : 
                       currentQuestion.text.toLowerCase().includes('fever') ? 'fever' :
                       currentQuestion.text.toLowerCase().includes('cough') ? 'cough' : 
                       currentQuestion.text.toLowerCase().includes('headache') ? 'headache' : 'symptom';
        setCollectedSymptoms(prev => [...prev, symptom]);
      }
      
      // Continue with more questions or proceed to diagnosis
      continueSymptomQuestions();
    }
  };

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
        askFirstSymptomQuestion();
      }, 1000);
    }, 1500);
  };

  // Ask first symptom question
  const askFirstSymptomQuestion = () => {
    const question: AdaptiveQuestion = {
      id: 'symptom_pain',
      text: 'Are you experiencing any pain or discomfort?',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
        { value: 'mild', label: 'Mild discomfort' }
      ]
    };
    setCurrentQuestion(question);
    setCurrentStep(5);
  };

  // Continue with more symptom questions
  const continueSymptomQuestions = () => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    
    if (nextStep < 8) {
      // Ask more symptom questions
      const questions = [
        {
          id: 'symptom_fever',
          text: 'Do you have a fever or feel unusually warm?',
          options: [
            { value: 'yes', label: 'Yes, I have fever' },
            { value: 'no', label: 'No fever' },
            { value: 'unsure', label: "I'm not sure" }
          ]
        },
        {
          id: 'symptom_cough',
          text: 'Are you experiencing any coughing?',
          options: [
            { value: 'yes', label: 'Yes, frequent coughing' },
            { value: 'no', label: 'No coughing' },
            { value: 'occasional', label: 'Occasional cough' }
          ]
        },
        {
          id: 'symptom_headache',
          text: 'Do you have a headache?',
          options: [
            { value: 'yes', label: 'Yes, headache' },
            { value: 'no', label: 'No headache' },
            { value: 'mild', label: 'Mild headache' }
          ]
        }
      ];
      
      const questionIndex = nextStep - 6;
      if (questionIndex < questions.length) {
        setTimeout(() => {
          setCurrentQuestion(questions[questionIndex]);
        }, 1000);
      } else {
        // Proceed to diagnosis
        setTimeout(() => {
          performDiagnosis();
        }, 1000);
      }
    } else {
      // Proceed to diagnosis
      setTimeout(() => {
        performDiagnosis();
      }, 1000);
    }
  };

  // Perform AI diagnosis based on collected data
  const performDiagnosis = async () => {
    setChatPhase('diagnosis');
    setCurrentStep(10);
    
    showTypingIndicator();
    
    try {
      // Fetch conditions from Supabase
      const { data: conditions, error } = await supabase
        .from('conditions')
        .select('*')
        .limit(10);
        
      if (error) throw error;

      // Simple matching algorithm - match symptoms to conditions
      let bestMatch = null;
      let highestScore = 0;

      if (conditions && conditions.length > 0) {
        for (const condition of conditions) {
          let score = 0;
          const conditionSymptoms = Array.isArray(condition.symptoms) ? condition.symptoms as string[] : [];
          
          // Calculate score based on matching symptoms
          for (const userSymptom of collectedSymptoms) {
            if (conditionSymptoms.some((s: string) => s.toLowerCase().includes(userSymptom.toLowerCase()))) {
              score += 25; // Each matching symptom adds 25%
            }
          }
          
          // Add base probability
          if (score > 0) {
            score = Math.min(score + 30, 95); // Cap at 95%
          }
          
          if (score > highestScore && score >= 80) {
            highestScore = score;
            bestMatch = condition;
          }
        }
        
        // Fallback to first condition if no high confidence match
        if (!bestMatch && conditions.length > 0) {
          bestMatch = conditions[0];
          highestScore = 75;
        }
      }

      removeTypingIndicator();
      
      if (bestMatch && highestScore >= 80) {
        // Create diagnosis result
        const diagnosis: DiagnosisResult = {
          condition: bestMatch.name,
          confidence: highestScore,
          icd10: 'R00-R09', // Generic code for now
          explanation: `Based on your symptoms, this condition matches ${highestScore}% of the reported cases with similar symptoms.`,
          drugs: (bestMatch.drug_usage || []).map((drug: any) => ({
            name: drug.drug || 'Consult your doctor',
            dosage: 'As prescribed',
            usage: drug.usage || 'Follow medical advice'
          }))
        };
        
        setDiagnosisResult(diagnosis);
        
        // Show diagnosis message
        const diagnosisMessage: ChatMessage = {
          id: `diagnosis-${Date.now()}`,
          text: `Based on your symptoms, I've identified a potential condition. Let me show you the results.`,
          isBot: true,
          timestamp: new Date(),
          component: 'diagnosis'
        };
        setMessages(prev => [...prev, diagnosisMessage]);
        
        setChatPhase('complete');
        setCurrentStep(12);
        
      } else {
        // No confident diagnosis
        const noResultMessage: ChatMessage = {
          id: `no-diagnosis-${Date.now()}`,
          text: "I couldn't identify a specific condition with high confidence. I recommend consulting with one of our doctors for a proper evaluation.",
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, noResultMessage]);
        setChatPhase('complete');
        setCurrentStep(12);
      }
      
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

  // Save prescription to Supabase
  const savePrescription = async () => {
    if (!diagnosisResult) return;

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
        entered_symptoms: collectedSymptoms,
        calculated_probabilities: [{
          condition: diagnosisResult.condition,
          probability: diagnosisResult.confidence
        }],
        suggested_drugs: diagnosisResult.drugs,
        age: userProfile.age || 25,
        gender: userProfile.gender || 'not specified',
        duration: 'recent'
      });

      if (error) throw error;

      toast({
        title: "Results Saved",
        description: "Your diagnostic results have been saved successfully."
      });
      
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save results.",
        variant: "destructive"
      });
    }
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
        {/* Header */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <Stethoscope className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">AI Diagnostic Assistant</h1>
              <p className="text-sm text-muted-foreground">Powered by Prescribly</p>
            </div>
          </div>
          
          {/* Progress Indicator */}
          {currentStep > 0 && (
            <div className="max-w-md mx-auto mb-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Question {currentStep} of {totalSteps}</span>
                <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
              </div>
              <ProgressSteps current={currentStep} total={totalSteps} />
            </div>
          )}
        </div>

        {/* Chat Container */}
        <Card className="h-[600px] flex flex-col border border-primary/10 shadow-lg overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center gap-3 p-4 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="p-2 rounded-full bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-primary">AI Diagnostic Assistant</h3>
              <p className="text-xs text-muted-foreground">Online • Ready to help</p>
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
        </Card>

        {/* Diagnosis Results */}
        {diagnosisResult && (
          <div className="mt-6 animate-fade-in">
            <DiagnosisResults 
              diagnoses={[{
                name: diagnosisResult.condition,
                confidence: diagnosisResult.confidence / 100,
                icd10: diagnosisResult.icd10
              }]}
              safetyNotes={[diagnosisResult.explanation]}
            />
            
            {/* Prescription Details */}
            {diagnosisResult.drugs.length > 0 && (
              <Card className="mt-4 border border-primary/10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Pill className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-primary">Recommended Treatment</h3>
                  </div>
                  <div className="space-y-3">
                    {diagnosisResult.drugs.map((drug, index) => (
                      <div key={index} className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-primary">{drug.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{drug.usage}</p>
                          </div>
                          <Badge variant="outline" className="ml-3 border-primary/30 text-primary">
                            {drug.dosage}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Disclaimer */}
            <Card className="mt-4 border-destructive/20 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive mb-1">
                      ⚠️ Only a licensed doctor can confirm this prescription.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This AI analysis is for informational purposes only and should not replace professional medical advice.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button 
                onClick={() => navigate('/book-appointment')}
                className="flex-1 bg-primary hover:bg-primary/90"
                size="lg"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Talk to a Prescribly Doctor
              </Button>
              <Button 
                variant="outline" 
                onClick={savePrescription}
                className="flex-1 sm:flex-none border-primary/30 hover:bg-primary/5"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Result
              </Button>
            </div>

            {/* Additional Actions */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              <Button variant="ghost" size="sm" className="text-xs">
                <FileDown className="h-3 w-3 mr-1" />
                Download PDF
              </Button>
              <Button variant="ghost" size="sm" className="text-xs">
                <Bell className="h-3 w-3 mr-1" />
                Set Reminder
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => window.location.reload()}>
                <Brain className="h-3 w-3 mr-1" />
                New Consultation
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WellnessChecker;