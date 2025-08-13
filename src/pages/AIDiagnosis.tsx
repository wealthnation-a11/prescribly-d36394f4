import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Bot, User, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { usePageSEO } from "@/hooks/usePageSEO";
const AIDiagnosis = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);

  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  usePageSEO({
    title: "AI Diagnosis | Prescribly",
    description: "AI-driven symptom analysis and safe, compliant prescriptions.",
    canonicalPath: "/ai-diagnosis",
  });

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
    logActivity('ai_diagnosis_message_sent', 'User sent AI diagnosis response', { length: userMessage.content.length });

    try {
      const symptomSummary = symptomData
        ? `Main: ${symptomData.mainSymptom}; Additional: ${symptomData.additionalSymptoms || 'none'}; Duration: ${symptomData.duration}; Severity: ${Array.isArray(symptomData.severity) ? symptomData.severity[0] : symptomData.severity}/5.`
        : inputMessage;

      const { data, error } = await supabase.functions.invoke('ai-diagnosis', {
        body: {
          symptomText: `${symptomSummary}\nUser response: ${inputMessage}`,
          selectedSymptoms: symptomData ? [symptomData.mainSymptom, ...(symptomData.additionalSymptoms ? symptomData.additionalSymptoms.split(',').map((s:string)=>s.trim()) : [])] : [],
          clarifyingAnswers: inputMessage,
        },
      });

      if (error) throw error;

      const lines: string[] = [];
      if (data?.diagnoses?.length) {
        lines.push('Based on the information, here are possible diagnoses:');
        data.diagnoses.forEach((d: any, i: number) => {
          lines.push(`${i+1}. ${d.name} (ICD-10: ${d.icd10}) — Confidence: ${(d.confidence*100).toFixed(0)}%`);
        });
      }
      if (data?.status === 'prescription_generated') {
        lines.push('\n✅ Prescription generated according to standing order protocols. You can view it in My Prescriptions.');
      } else if (data?.status === 'review_required') {
        lines.push('\n⚠️ This case requires doctor review before prescribing.');
      } else {
        lines.push('\n✅ Diagnosis complete.');
      }
      if (data?.safetyFlags?.length) {
        lines.push('\nSafety notes:');
        data.safetyFlags.forEach((s: string) => lines.push(`- ${s}`));
      }

      setAiResult(data);
      logActivity('ai_diagnosis_completed', 'AI diagnosis completed', {
        status: data?.status,
        diagnosesCount: data?.diagnoses?.length || 0,
        visitId: data?.visitId,
        prescriptionId: data?.prescription?.id || null,
      });

      const aiResponse = {
        id: messages.length + 2,
        type: 'ai',
        content: lines.join('\n'),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);

      if (data?.status === 'prescription_generated') {
        toast({ title: 'Prescription generated', description: 'Redirecting to your prescriptions...' });
        setTimeout(() => navigate('/my-prescriptions'), 800);
      } else if (data?.status === 'review_required') {
        toast({ title: 'Doctor review required', description: 'A doctor will review this case before prescribing.' });
      }
    } catch (err: any) {
      const aiResponse = {
        id: messages.length + 2,
        type: 'ai',
        content: 'Sorry, something went wrong analyzing your symptoms. Please try again or contact support.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    } finally {
      setIsLoading(false);
    }
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

      {/* Results Panel */}
      {aiResult && (
        <div className="max-w-md mx-auto w-full px-4 pb-2">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Assessment Summary</h2>
                <Badge variant={aiResult.status === 'prescription_generated' ? 'default' : aiResult.status === 'review_required' ? 'secondary' : 'outline'}>
                  {aiResult.status?.replace(/_/g, ' ') || 'complete'}
                </Badge>
              </div>

              {Array.isArray(aiResult.diagnoses) && aiResult.diagnoses.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Possible diagnoses</p>
                  <div className="space-y-2">
                    {aiResult.diagnoses.map((d: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium">{d.name}</div>
                          <div className="text-xs text-muted-foreground">ICD-10: {d.icd10}</div>
                        </div>
                        <Badge variant="outline">{Math.round((d.confidence || 0) * 100)}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(aiResult.safetyFlags) && aiResult.safetyFlags.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Safety notes</p>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                    {aiResult.safetyFlags.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiResult.status === 'prescription_generated' && (
                <Button className="w-full" onClick={() => navigate('/my-prescriptions')}>
                  View Prescription
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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