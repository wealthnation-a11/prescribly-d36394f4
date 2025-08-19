import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePageSEO } from '@/hooks/usePageSEO';
import { 
  Brain, 
  Send, 
  Loader2,
  Bot,
  User,
  Stethoscope,
  Pill,
  Activity,
  Trophy,
  CheckCircle,
  Save
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isAi: boolean;
  timestamp: Date;
  isTyping?: boolean;
}

interface DiagnosisResult {
  condition: string;
  probability: number;
  drugs: Array<{
    name: string;
    dosage: string;
    usage: string;
  }>;
}

const AIHealthCompanion = () => {
  usePageSEO({
    title: "AI Health Companion - Prescribly",
    description: "Interactive AI health companion with progressive diagnosis and personalized treatment recommendations.",
    canonicalPath: "/ai-health-companion"
  });

  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSymptoms, setCurrentSymptoms] = useState<string[]>([]);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            status: 'active'
          })
          .select()
          .single();

        if (error) throw error;

        setSessionId(data.id);

        // Initial greeting
        const initialMessage: Message = {
          id: '1',
          text: "👋 Hello! I'm your AI Health Companion. I'll ask you a series of questions to understand your symptoms better.\n\nTo get started, please tell me: What's the main health concern that brought you here today?",
          isAi: true,
          timestamp: new Date()
        };
        setMessages([initialMessage]);
      } catch (error: any) {
        console.error('Error initializing session:', error);
        toast({
          title: "Error",
          description: "Failed to start AI companion session.",
          variant: "destructive"
        });
      }
    };

    initializeSession();
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
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: currentMessage,
      isAi: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    showTypingIndicator();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('ai-health-companion', {
        body: {
          message: currentMessage,
          sessionId,
          userId: user?.id,
          conversationHistory: messages.map(m => ({
            role: m.isAi ? 'assistant' : 'user',
            content: m.text
          })),
          currentSymptoms
        }
      });

      if (error) throw error;

      removeTypingIndicator();

      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        text: data.response,
        isAi: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);

      if (data.symptoms) {
        setCurrentSymptoms(data.symptoms);
      }

      if (data.isComplete) {
        setIsComplete(true);
        setDiagnosisResult(data.diagnosis);
        setPointsEarned(data.pointsEarned || 0);
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      removeTypingIndicator();
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: "I apologize, but I'm having trouble processing your request. Please try again.",
        isAi: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const savePrescription = async () => {
    if (!diagnosisResult) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to save your prescription.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.from('wellness_checks').insert({
        user_id: user.id,
        entered_symptoms: currentSymptoms,
        calculated_probabilities: [{
          condition: diagnosisResult.condition,
          probability: diagnosisResult.probability,
          drugs: diagnosisResult.drugs
        }],
        suggested_drugs: diagnosisResult.drugs,
        age: 25,
        gender: 'not specified',
        duration: 'recent'
      });

      if (error) throw error;

      toast({
        title: "Prescription Saved",
        description: "Your AI diagnosis has been saved to My Prescriptions."
      });
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save prescription.",
        variant: "destructive"
      });
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
        <Stethoscope className="absolute top-40 right-20 w-12 h-12 text-accent medical-icon" />
        <Activity className="absolute bottom-40 left-20 w-20 h-20 text-primary medical-icon" />
        <Pill className="absolute top-60 right-40 w-14 h-14 text-accent medical-icon" />
        <Trophy className="absolute bottom-20 right-10 w-16 h-16 text-primary medical-icon" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-primary">AI Health Companion</h1>
              <p className="text-lg text-primary/80 font-medium">Progressive Diagnosis & Treatment</p>
            </div>
          </div>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Interactive AI companion that asks progressive questions to understand your symptoms and provide personalized treatment recommendations
          </p>

          {/* Points Display */}
          {pointsEarned > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-2 rounded-full font-semibold animate-pulse">
              <Trophy className="h-5 w-5" />
              +{pointsEarned} Points Earned! 🎉
            </div>
          )}
        </div>

        {/* Symptoms Tracker */}
        {currentSymptoms.length > 0 && (
          <div className="max-w-4xl mx-auto mb-6">
            <Card className="glassmorphism-card border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-primary">Identified Symptoms</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentSymptoms.map((symptom, index) => (
                    <Badge key={index} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {symptom}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Chat Container */}
        <div className="max-w-4xl mx-auto">
          <Card className="h-[650px] flex flex-col chat-container border-0 shadow-lg">
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-accent/5">
              <div className="p-2 rounded-full bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">AI Health Companion</h3>
                <p className="text-xs text-muted-foreground">
                  {isComplete ? 'Diagnosis Complete' : 'Analyzing symptoms...'}
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
                  placeholder={isComplete ? "Diagnosis complete!" : "Describe your symptoms or answer the question..."}
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

        {/* Action Button (shown after diagnosis) */}
        {isComplete && diagnosisResult && (
          <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
            <Button 
              onClick={savePrescription}
              className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              size="icon"
            >
              <Save className="h-6 w-6" />
            </Button>
            <p className="text-xs text-center mt-2 text-muted-foreground font-medium">Save</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIHealthCompanion;