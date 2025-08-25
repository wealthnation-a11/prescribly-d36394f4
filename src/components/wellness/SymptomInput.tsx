import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Mic, 
  Plus,
  X,
  Sparkles
} from 'lucide-react';

interface SymptomInputProps {
  onSymptomSubmit: (text: string, symptoms: string[]) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export const SymptomInput: React.FC<SymptomInputProps> = ({
  onSymptomSubmit,
  isLoading = false,
  placeholder = "Describe your symptoms in detail... (e.g., 'I have a headache and feel dizzy')"
}) => {
  const [input, setInput] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Common symptoms for quick selection
  const commonSymptoms = [
    'Headache', 'Fever', 'Fatigue', 'Cough', 'Nausea', 
    'Dizziness', 'Chest pain', 'Abdominal pain', 'Joint pain', 
    'Shortness of breath', 'Sore throat', 'Back pain'
  ];

  const handleSubmit = () => {
    if (!input.trim() && selectedSymptoms.length === 0) return;
    
    onSymptomSubmit(input.trim(), selectedSymptoms);
    setInput('');
    setSelectedSymptoms([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const removeSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => prev.filter(s => s !== symptom));
  };

  const startVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
      };
      
      recognition.start();
    }
  };

  return (
    <div className="space-y-4">
      {/* Free Text Input */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Describe your symptoms naturally - our AI will understand</span>
            </div>
            
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                className="min-h-[100px] pr-12 resize-none border-primary/20 focus:border-primary/50"
                disabled={isLoading}
              />
              
              <div className="absolute bottom-2 right-2 flex gap-1">
                {/* Voice Input */}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={startVoiceInput}
                  disabled={isLoading}
                  className={`h-8 w-8 p-0 ${isListening ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`}
                >
                  <Mic className="h-4 w-4" />
                </Button>
                
                {/* Submit */}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isLoading || (!input.trim() && selectedSymptoms.length === 0)}
                  className="h-8 w-8 p-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Symptom Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Plus className="h-4 w-4" />
              Quick Add Common Symptoms
            </div>
            
            <div className="flex flex-wrap gap-2">
              {commonSymptoms.map((symptom) => (
                <Badge
                  key={symptom}
                  variant={selectedSymptoms.includes(symptom) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => toggleSymptom(symptom)}
                >
                  {symptom}
                  {selectedSymptoms.includes(symptom) && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Symptoms Summary */}
      {selectedSymptoms.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-primary">
                Selected Symptoms ({selectedSymptoms.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedSymptoms.map((symptom) => (
                  <Badge
                    key={symptom}
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                  >
                    {symptom}
                    <button
                      onClick={() => removeSymptom(symptom)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};