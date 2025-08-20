import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePageSEO } from '@/hooks/usePageSEO';
import { 
  Brain, 
  Send, 
  Loader2,
  Bot,
  User,
  Trophy,
  CheckCircle,
  BarChart3,
  Calendar
} from 'lucide-react';

interface Question {
  id: number;
  category: string;
  question_text: string;
}

interface Message {
  id: string;
  text: string;
  isAi: boolean;
  timestamp: Date;
  isTyping?: boolean;
}

const AIHealthCompanion = () => {
  usePageSEO({
    title: "Daily Health Check-in - Prescribly",
    description: "Complete your daily health check-in with our AI companion and track your wellness journey.",
    canonicalPath: "/ai-health-companion"
  });

  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load daily questions
  useEffect(() => {
    const loadDailyQuestions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase.rpc('get_daily_questions_for_user', {
          user_uuid: user.id
        });

        if (error) throw error;

        if (data && data.length > 0) {
          setQuestions(data);
          
          // Initial greeting with first question
          const initialMessage: Message = {
            id: '1',
            text: `👋 Good to see you! Ready for today's health check-in?\n\n${data[0].question_text}`,
            isAi: true,
            timestamp: new Date()
          };
          setMessages([initialMessage]);
        } else {
          // User has completed today's questions
          const completedMessage: Message = {
            id: '1',
            text: "🎉 You've already completed today's health check-in! Come back tomorrow for new questions.",
            isAi: true,
            timestamp: new Date()
          };
          setMessages([completedMessage]);
          setIsComplete(true);
        }
      } catch (error: any) {
        console.error('Error loading questions:', error);
        toast({
          title: "Error",
          description: "Failed to load today's health questions.",
          variant: "destructive"
        });
      }
    };

    loadDailyQuestions();
  }, []);

  const showTypingIndicator = () => {
    const typingMessage: Message = {
      id: `typing-${Date.now()}`,
      text: "...",
      isAi: true,
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);
  };

  const removeTypingIndicator = () => {
    setMessages(prev => prev.filter(msg => !msg.isTyping));
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading || questions.length === 0) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: currentMessage,
      isAi: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    showTypingIndicator();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Save the answer
      const { error: saveError } = await supabase
        .from('user_daily_checkins')
        .insert({
          user_id: user.id,
          question_id: questions[currentQuestionIndex].id,
          answer: currentMessage
        });

      if (saveError) throw saveError;

      // Award points
      await supabase.rpc('update_user_points', {
        user_uuid: user.id,
        points_to_add: 5
      });

      removeTypingIndicator();

      // Check if more questions
      if (currentQuestionIndex + 1 < questions.length) {
        const nextQuestion = questions[currentQuestionIndex + 1];
        const nextMessage: Message = {
          id: `ai-${Date.now()}`,
          text: `Great! Next question:\n\n${nextQuestion.question_text}`,
          isAi: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, nextMessage]);
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        // All questions completed
        const totalPoints = questions.length * 5;
        setPointsEarned(totalPoints);
        
        const completionMessage: Message = {
          id: `completion-${Date.now()}`,
          text: `🎉 Fantastic! You've completed today's health check-in and earned +${totalPoints} points!\n\nYour answers have been saved to help track your health trends over time.`,
          isAi: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, completionMessage]);
        setIsComplete(true);
      }

      setCurrentMessage('');
    } catch (error: any) {
      console.error('Error saving answer:', error);
      removeTypingIndicator();
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: "I'm having trouble saving your answer. Please try again.",
        isAi: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessageText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="min-h-screen medical-background relative overflow-hidden">
      {/* Background Medical Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <Brain className="absolute top-20 left-10 w-16 h-16 text-primary medical-icon" />
        <Calendar className="absolute top-40 right-20 w-12 h-12 text-accent medical-icon" />
        <BarChart3 className="absolute bottom-40 left-20 w-20 h-20 text-primary medical-icon" />
        <Trophy className="absolute bottom-20 right-10 w-16 h-16 text-primary medical-icon" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-primary">Daily Health Check-in</h1>
              <p className="text-lg text-primary/80 font-medium">Track Your Wellness Journey</p>
            </div>
          </div>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Answer a few quick questions each day to build healthy habits and earn points
          </p>

          {/* Points Display */}
          {pointsEarned > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-2 rounded-full font-semibold animate-pulse">
              <Trophy className="h-5 w-5" />
              +{pointsEarned} Points Earned! 🎉
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        {questions.length > 0 && !isComplete && (
          <div className="max-w-2xl mx-auto mb-6">
            <Card className="glassmorphism-card border-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {currentQuestionIndex + 1} of {questions.length}
                  </span>
                </div>
                <div className="w-full bg-primary/10 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Chat Container */}
        <div className="max-w-3xl mx-auto">
          <Card className="h-[500px] flex flex-col chat-container border-0 shadow-lg">
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-accent/5">
              <div className="p-2 rounded-full bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">Health Companion</h3>
                <p className="text-xs text-muted-foreground">
                  {isComplete ? 'Check-in Complete' : 'Daily Questions'}
                </p>
              </div>
              {isComplete && (
                <div className="ml-auto">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
              )}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-white/50 to-primary/5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isAi ? 'justify-start' : 'justify-end'}`}
                  style={{
                    animation: 'slideInUp 0.5s ease-out'
                  }}
                >
                  <div className={`flex items-start gap-3 max-w-[85%] ${message.isAi ? 'flex-row' : 'flex-row-reverse'}`}>
                    {/* Avatar */}
                    <div className={`p-2 rounded-full ${
                      message.isAi 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'bg-accent/20 border border-accent/30'
                    } flex-shrink-0`}>
                      {message.isAi ? (
                        <Bot className="h-4 w-4 text-primary" />
                      ) : (
                        <User className="h-4 w-4 text-accent-foreground" />
                      )}
                    </div>
                    
                    {/* Message Bubble */}
                    <div className={`px-5 py-3 rounded-2xl shadow-md ${
                      message.isAi 
                        ? 'chat-ai-bubble text-foreground rounded-bl-md' 
                        : 'chat-user-bubble text-white rounded-br-md'
                    }`}>
                      {message.isTyping ? (
                        <div className="flex space-x-1 py-1">
                          <div className="w-2 h-2 bg-primary/60 rounded-full" style={{
                            animation: 'typingPulse 1.5s infinite'
                          }}></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full" style={{
                            animation: 'typingPulse 1.5s infinite 0.2s'
                          }}></div>
                          <div className="w-2 h-2 bg-primary/60 rounded-full" style={{
                            animation: 'typingPulse 1.5s infinite 0.4s'
                          }}></div>
                        </div>
                      ) : (
                        <div 
                          className="text-sm leading-relaxed whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: formatMessageText(message.text) }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-primary/10 p-4 bg-gradient-to-r from-white to-primary/5">
              <div className="flex gap-3">
                <Input
                  placeholder={isComplete ? "Come back tomorrow for more questions!" : "Type your answer..."}
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isLoading || isComplete}
                  className="flex-1 rounded-full border-primary/20 focus:ring-primary/30 focus:border-primary/40"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={isLoading || !currentMessage.trim() || isComplete}
                  size="icon"
                  className="rounded-full w-12 h-12 bg-primary hover:bg-primary/90 shadow-lg"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Buttons (shown after completion) */}
        {isComplete && (
          <div className="flex justify-center gap-4 mt-6 animate-fade-in">
            <Button 
              onClick={() => window.location.href = '/health-trends'}
              className="rounded-full px-6 py-3 bg-green-500 hover:bg-green-600 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              View Health Trends
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIHealthCompanion;