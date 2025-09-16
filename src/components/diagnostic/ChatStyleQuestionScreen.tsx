import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Bot, User, CheckCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Question {
  id: string;
  question: string;
  condition_id?: number;
}

interface ChatStyleQuestionScreenProps {
  symptoms: string[];
  onSubmit: (questions: Question[], answers: Record<string, string>) => void;
  loading?: boolean;
}

interface ChatMessage {
  id: string;
  type: 'bot' | 'user' | 'question';
  content: string;
  timestamp: Date;
  question?: Question;
  options?: string[];
}

export const ChatStyleQuestionScreen: React.FC<ChatStyleQuestionScreenProps> = ({
  symptoms,
  onSubmit,
  loading = false
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load questions on mount
  useEffect(() => {
    const loadQuestions = async () => {
      setQuestionsLoading(true);
      try {
        // Get related conditions for the symptoms
        const { data: conditionsData, error: conditionsError } = await supabase
          .from('conditions')
          .select('id, name')
          .limit(10);

        if (conditionsError) throw conditionsError;

        let questionsData: Question[] = [];
        
        if (conditionsData && conditionsData.length > 0) {
          // Get clarifying questions for the top conditions
          const conditionIds = conditionsData.map(c => c.id);
          
          const { data: fetchedQuestions, error: questionsError } = await supabase
            .from('clarifying_questions')
            .select('id, condition_id, question')
            .in('condition_id', conditionIds)
            .limit(6);

          if (!questionsError && fetchedQuestions && fetchedQuestions.length > 0) {
            questionsData = fetchedQuestions.map(q => ({
              id: q.id.toString(),
              question: q.question,
              condition_id: q.condition_id
            }));
          }
        }

        // If no questions found from database, use fallback questions
        if (questionsData.length === 0) {
          questionsData = [
            {
              id: 'duration',
              question: 'How long have you been experiencing these symptoms?'
            },
            {
              id: 'severity',
              question: 'How would you rate the severity of your symptoms on a scale of 1-10?'
            },
            {
              id: 'onset',
              question: 'Did your symptoms start suddenly or gradually?'
            },
            {
              id: 'triggers',
              question: 'Have you noticed any triggers that make your symptoms worse?'
            },
            {
              id: 'relief',
              question: 'Have you tried anything that provides relief?'
            }
          ];
        }

        setQuestions(questionsData);
        
        // Add initial messages
        const initialMessages: ChatMessage[] = [
          {
            id: 'welcome',
            type: 'bot',
            content: `Hello! I see you're experiencing ${symptoms.join(', ')}. I'd like to ask you a few questions to better understand your condition and provide more accurate recommendations.`,
            timestamp: new Date()
          }
        ];
        
        setMessages(initialMessages);
        
        // Start asking questions after a brief delay
        setTimeout(() => {
          askNextQuestion(questionsData, 0, initialMessages);
        }, 1000);
        
      } catch (error) {
        console.error('Error loading questions:', error);
        toast.error('Failed to load questions');
      } finally {
        setQuestionsLoading(false);
      }
    };

    loadQuestions();
  }, [symptoms]);

  const askNextQuestion = (questionsList: Question[], index: number, currentMessages: ChatMessage[]) => {
    if (index >= questionsList.length) {
      // All questions answered, show completion message only
      const completionMessage: ChatMessage = {
        id: 'completion',
        type: 'bot',
        content: 'Perfect! I have all the information I need. Let me analyze your symptoms and provide you with a diagnosis.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, completionMessage]);
      return;
    }

    const question = questionsList[index];
    const options = getQuestionOptions(question.id, question.question);
    
    setIsTyping(true);
    
    // Simulate typing delay
    setTimeout(() => {
      const questionMessage: ChatMessage = {
        id: `question-${index}`,
        type: 'question',
        content: question.question,
        timestamp: new Date(),
        question: question,
        options: options
      };
      
      setMessages(prev => [...prev, questionMessage]);
      setIsTyping(false);
    }, 1500);
  };
  const handleAnswerSelect = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    // Add user's answer to chat
    const userMessage: ChatMessage = {
      id: `answer-${questionId}`,
      type: 'user',
      content: answer,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Move to next question
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);

    // If last question, finalize and submit immediately
    if (nextIndex >= questions.length) {
      const completionMessage: ChatMessage = {
        id: 'completion',
        type: 'bot',
        content: 'Perfect! I have all the information I need. Let me analyze your symptoms and provide you with a diagnosis.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, completionMessage]);
      setTimeout(() => onSubmit(questions, newAnswers), 500);
      return;
    }
    
    setTimeout(() => {
      askNextQuestion(questions, nextIndex, messages);
    }, 500);
  };
  const getQuestionOptions = (questionId: string, question: string) => {
    const lowerQ = question.toLowerCase();
    
    if (lowerQ.includes('duration') || lowerQ.includes('how long')) {
      return ['Less than 1 day', '1-3 days', '4-7 days', '1-2 weeks', 'More than 2 weeks'];
    }
    
    if (lowerQ.includes('severity') || lowerQ.includes('scale')) {
      return ['1-2 (Mild)', '3-4 (Mild-Moderate)', '5-6 (Moderate)', '7-8 (Severe)', '9-10 (Very Severe)'];
    }
    
    if (lowerQ.includes('sudden') || lowerQ.includes('gradual') || lowerQ.includes('onset')) {
      return ['Suddenly (within minutes)', 'Gradually over hours', 'Gradually over days', 'Not sure'];
    }
    
    if (lowerQ.includes('trigger') || lowerQ.includes('worse')) {
      return ['Physical activity', 'Stress', 'Certain foods', 'Weather changes', 'No specific triggers', 'Not sure'];
    }
    
    if (lowerQ.includes('relief') || lowerQ.includes('better')) {
      return ['Rest', 'Medication', 'Heat/Cold therapy', 'Movement/Exercise', 'Nothing helps', 'Haven\'t tried anything'];
    }
    
    // Default yes/no options
    return ['Yes', 'No', 'Not sure'];
  };

  if (questionsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-lg text-muted-foreground">Preparing personalized questions...</p>
        </div>
      </div>
    );
  }

  const progress = (Object.keys(answers).length / questions.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Bot className="h-16 w-16 text-primary mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-2">Health Assessment Chat</h2>
        <p className="text-muted-foreground text-lg">
          Let's discuss your symptoms in detail
        </p>
      </motion.div>

      {/* Selected Symptoms Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Your symptoms:</p>
          <div className="flex flex-wrap gap-2">
            {symptoms.map((symptom) => (
              <Badge key={symptom} variant="secondary" className="bg-primary/10 text-primary">
                {symptom}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="text-primary font-medium">
            {Object.keys(answers).length} of {questions.length} questions answered
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <motion.div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Chat Interface */}
      <Card className="min-h-[400px] max-h-[70vh] overflow-hidden flex flex-col shadow-lg border-primary/20">
        <CardContent className="p-0 flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type !== 'user' && (
                    <Avatar className="h-8 w-8 bg-primary">
                      <AvatarFallback>
                        <Bot className="h-4 w-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
                    <div className={`rounded-lg p-3 ${
                      message.type === 'user' 
                        ? 'bg-primary text-white ml-auto' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                    
                    {message.type === 'question' && message.options && !answers[message.question!.id] && (
                      <div className="mt-3 space-y-2">
                        {message.options.map((option, index) => (
                          <motion.div
                            key={option}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start text-left h-auto p-3 hover:bg-primary hover:text-white"
                              onClick={() => handleAnswerSelect(message.question!.id, option)}
                            >
                              {option}
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {message.type === 'user' && (
                    <Avatar className="h-8 w-8 bg-secondary">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <Avatar className="h-8 w-8 bg-primary">
                  <AvatarFallback>
                    <Bot className="h-4 w-4 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {progress === 100 && !loading && (
            <div className="p-4 border-t bg-green-50/50 border-green-200">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Assessment Complete!</span>
              </div>
              <p className="text-sm text-green-600 text-center mt-1">
                Generating your personalized diagnosis...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};