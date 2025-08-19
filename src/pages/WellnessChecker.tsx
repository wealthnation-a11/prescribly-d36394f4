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
  User,
  Stethoscope,
  Pill,
  Activity,
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
    <div className="min-h-screen medical-background relative overflow-hidden">
      {/* Background Medical Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <Stethoscope className="absolute top-20 left-10 w-16 h-16 text-primary medical-icon" />
        <Pill className="absolute top-40 right-20 w-12 h-12 text-accent medical-icon" />
        <Activity className="absolute bottom-40 left-20 w-20 h-20 text-primary medical-icon" />
        <Brain className="absolute top-60 right-40 w-14 h-14 text-accent medical-icon" />
        <Stethoscope className="absolute bottom-20 right-10 w-16 h-16 text-primary medical-icon" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <Stethoscope className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-primary">Prescribly</h1>
              <p className="text-lg text-primary/80 font-medium">AI Wellness Checker</p>
            </div>
          </div>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Chat with our AI doctor for instant health analysis and personalized medical recommendations
          </p>
        </div>

        {/* Chat Container */}
        <div className="max-w-4xl mx-auto">
          <Card className="h-[650px] flex flex-col chat-container border-0 shadow-lg">
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-accent/5">
              <div className="p-2 rounded-full bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">Dr. AI Assistant</h3>
                <p className="text-xs text-muted-foreground">Online • Ready to help</p>
              </div>
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
                  placeholder="Describe your symptoms or ask a health question..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isLoading}
                  className="flex-1 rounded-full border-primary/20 focus:ring-primary/30 focus:border-primary/40"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={isLoading || !currentMessage.trim()}
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

        {/* Floating Save Button */}
        {chatState === 'complete' && diagnosisResult && (
          <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
            <Button 
              onClick={savePrescription}
              className="rounded-full w-16 h-16 bg-success-green hover:bg-success-green/90 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              size="icon"
            >
              <Save className="h-6 w-6" />
            </Button>
            <p className="text-xs text-center mt-2 text-muted-foreground font-medium">Save</p>
          </div>
        )}

        {/* Results Card (shown after diagnosis) */}
        {chatState === 'complete' && diagnosisResult && (
          <div className="mt-8 max-w-4xl mx-auto animate-fade-in">
            {/* Glassmorphism Results Card */}
            <Card className="glassmorphism-card border-0 mb-6">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Stethoscope className="h-8 w-8 text-primary" />
                    <h3 className="text-2xl font-bold text-primary">Diagnosis Results</h3>
                  </div>
                  <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-6 border border-primary/20">
                    <h4 className="text-xl font-semibold text-primary mb-2">{diagnosisResult.condition}</h4>
                    <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                      {diagnosisResult.probability}% Confidence
                    </Badge>
                  </div>
                </div>

                {diagnosisResult.drugs.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                      <Pill className="h-5 w-5" />
                      Recommended Treatment
                    </div>
                    <div className="grid gap-4">
                      {diagnosisResult.drugs.map((drug, index) => (
                        <div key={index} className="bg-white/50 rounded-lg p-4 border border-primary/10">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-semibold text-primary">{drug.name}</h5>
                              <p className="text-sm text-muted-foreground mt-1">{drug.usage}</p>
                            </div>
                            <Badge variant="secondary" className="ml-3">
                              {drug.dosage}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <Card className="border-destructive/20 bg-destructive/5 mb-6 glassmorphism-card">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-destructive">
                      ⚠️ This is AI-generated. Always consult a licensed medical professional.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This AI analysis is for informational purposes only and should not replace professional medical advice, diagnosis, or treatment.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto">
              <Button 
                onClick={() => navigate('/book-appointment')}
                className="flex-1 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
                size="lg"
              >
                <ArrowRight className="h-5 w-5 mr-2" />
                Consult Real Doctor
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="flex-1 sm:flex-none border-primary/30 hover:bg-primary/5 transition-all duration-300"
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