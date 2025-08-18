import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AlertTriangle,
  Loader2,
  Plus,
  ArrowRight,
  Bot,
  User
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

const WellnessChecker = () => {
  usePageSEO({
    title: "AI Wellness Checker - Prescribly",
    description: "Chat with our AI doctor for instant health analysis and personalized medical recommendations.",
    canonicalPath: "/wellness-checker"
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatState, setChatState] = useState<'greeting' | 'questioning' | 'diagnosis' | 'complete'>('greeting');
  const [patientData, setPatientData] = useState<any>({});
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat
  useEffect(() => {
    const initialMessage: Message = {
      id: '1',
      text: "Hi! I'm Dr. AI from Prescribly. I'm here to help you understand your symptoms and provide preliminary health guidance. What seems to be bothering you today?",
      isAi: true,
      timestamp: new Date()
    };
    setMessages([initialMessage]);
  }, []);

  // Simulate typing indicator
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

  // Process chat message
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

    // Show typing indicator
    showTypingIndicator();

    try {
      // Call chat diagnosis function
      const { data, error } = await supabase.functions.invoke('ai-diagnosis', {
        body: {
          message: currentMessage,
          chatHistory: messages,
          patientData,
          chatState
        }
      });

      if (error) throw error;

      removeTypingIndicator();

      // Add AI response
      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        text: data.response,
        isAi: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);

      // Update state based on response
      if (data.patientData) {
        setPatientData(prev => ({ ...prev, ...data.patientData }));
      }

      if (data.diagnosis) {
        setDiagnosisResult(data.diagnosis);
        setChatState('complete');
        
        // Show diagnosis card
        setTimeout(() => {
          const diagnosisCard: Message = {
            id: `diagnosis-${Date.now()}`,
            text: `**🩺 DIAGNOSIS**\n\n**${data.diagnosis.condition}** (${data.diagnosis.probability}% match)\n\n**💊 RECOMMENDED TREATMENT:**\n${data.diagnosis.drugs.map((drug: any) => `• **${drug.name}** - ${drug.dosage}\n  ${drug.usage}`).join('\n\n')}`,
            isAi: true,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, diagnosisCard]);
        }, 1000);
      } else {
        setChatState(data.nextState || 'questioning');
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

  // Save prescription
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
        entered_symptoms: [diagnosisResult.condition],
        calculated_probabilities: [{
          condition: diagnosisResult.condition,
          probability: diagnosisResult.probability,
          drugs: diagnosisResult.drugs
        }],
        suggested_drugs: diagnosisResult.drugs,
        age: patientData.age || 25,
        gender: patientData.gender || 'not specified',
        duration: patientData.duration || 'not specified'
      });

      if (error) throw error;

      toast({
        title: "Prescription Saved",
        description: "Your prescription has been saved to My Prescriptions."
      });
      
      setTimeout(() => navigate('/my-prescriptions'), 1000);
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save prescription.",
        variant: "destructive"
      });
    }
  };

  // Format message text with markdown-like styling
  const formatMessageText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-background/50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-primary mb-2">Prescribly</h1>
          <p className="text-xl text-muted-foreground">AI Health Consultation</p>
        </div>

        {/* Chat Container */}
        <Card className="max-w-3xl mx-auto h-[600px] flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isAi ? 'justify-start' : 'justify-end'} animate-fade-in`}
              >
                <div className={`flex items-start gap-2 max-w-[80%] ${message.isAi ? 'flex-row' : 'flex-row-reverse'}`}>
                  {/* Avatar */}
                  <div className={`p-2 rounded-full ${message.isAi ? 'bg-primary/10' : 'bg-secondary/10'} flex-shrink-0`}>
                    {message.isAi ? (
                      <Bot className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-secondary-foreground" />
                    )}
                  </div>
                  
                  {/* Message Bubble */}
                  <div 
                    className={`px-4 py-3 rounded-2xl ${
                      message.isAi 
                        ? 'bg-muted text-foreground rounded-bl-sm' 
                        : 'bg-primary text-primary-foreground rounded-br-sm'
                    }`}
                  >
                    {message.isTyping ? (
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
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
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={isLoading || !currentMessage.trim()}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Action Buttons (shown after diagnosis) */}
        {chatState === 'complete' && diagnosisResult && (
          <div className="mt-8 animate-fade-in">
            {/* Disclaimer */}
            <Card className="border-destructive bg-destructive/5 mb-6">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-destructive">
                      ⚠️ This is AI-generated. Always consult a licensed medical professional.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This AI analysis is for informational purposes only and should not replace professional medical advice.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto">
              <Button 
                onClick={savePrescription}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Save Prescription
              </Button>
              <Button 
                onClick={() => navigate('/book-appointment')}
                className="flex-1 bg-primary hover:bg-primary/90"
                size="lg"
              >
                <ArrowRight className="h-5 w-5 mr-2" />
                Consult Doctor
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="flex-1 sm:flex-none"
                onClick={() => window.location.reload()}
              >
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