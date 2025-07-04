import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Bot, User, Calendar } from "lucide-react";

const AIDiagnosis = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const symptomData = location.state?.symptomData;

  useEffect(() => {
    if (symptomData) {
      // Initialize conversation with symptom data
      const initialMessage = {
        id: 1,
        type: 'ai',
        content: `I see you're experiencing ${symptomData.mainSymptom}${symptomData.additionalSymptoms ? ` along with ${symptomData.additionalSymptoms}` : ''}. You've rated the severity as ${symptomData.severity[0]}/5 and you've had these symptoms for ${symptomData.duration}. 

Let me ask you a few follow-up questions to better understand your condition:

1. Do you have any fever or chills?
2. Have you taken any medication for these symptoms?
3. Are you experiencing any breathing difficulties?

Please answer these questions so I can provide a more accurate assessment.`,
        timestamp: new Date()
      };
      setMessages([initialMessage]);
    }
  }, [symptomData]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        type: 'ai',
        content: "Based on your symptoms and responses, this appears to be a mild upper respiratory infection. I recommend:\n\n💊 **Suggested Treatment:**\n- Rest and adequate hydration\n- Paracetamol 500mg every 6 hours for fever\n- Throat lozenges for throat irritation\n\n⚠️ **When to see a doctor:**\n- If symptoms worsen or persist beyond 5 days\n- If you develop difficulty breathing\n- If fever exceeds 39°C (102°F)\n\nWould you like me to generate a prescription or would you prefer to book an appointment with a doctor?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary p-4 text-white">
        <div className="max-w-md mx-auto flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5" />
            <h1 className="text-lg font-semibold">AI Health Assistant</h1>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-md mx-auto w-full p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-[80%] ${
                message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'user' 
                    ? 'bg-primary text-white' 
                    : 'bg-success-green text-white'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <Card className={`${
                  message.type === 'user' 
                    ? 'bg-primary text-white' 
                    : 'bg-white'
                }`}>
                  <CardContent className="p-3">
                    <p className="text-sm whitespace-pre-line">
                      {message.content}
                    </p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' 
                        ? 'text-white/70' 
                        : 'text-muted-foreground'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 rounded-full bg-success-green text-white flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {messages.length > 2 && (
        <div className="max-w-md mx-auto w-full p-4 space-y-2">
          <Button 
            className="w-full bg-success-green hover:bg-success-green/90"
            onClick={() => navigate('/book-appointment')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Book a Doctor
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="max-w-md mx-auto w-full p-4 border-t bg-white">
        <div className="flex space-x-2">
          <Input
            placeholder="Type your response..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIDiagnosis;