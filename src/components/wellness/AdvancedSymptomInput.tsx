import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Send, 
  Mic, 
  Plus,
  X,
  Sparkles,
  Brain,
  MessageSquare,
  Zap,
  Search
} from 'lucide-react';

interface AdvancedSymptomInputProps {
  onSymptomSubmit: (text: string, symptoms: string[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  confidence?: number;
}

export const AdvancedSymptomInput: React.FC<AdvancedSymptomInputProps> = ({
  onSymptomSubmit,
  isLoading = false,
  placeholder = "Describe your symptoms naturally - I'll use advanced AI to understand...",
  confidence = 0
}) => {
  const [input, setInput] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [inputMethod, setInputMethod] = useState<'freetext' | 'guided' | 'quick'>('freetext');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Advanced symptom categories for quick selection
  const symptomCategories = {
    'General': ['Fever', 'Fatigue', 'Loss of appetite', 'Sweating', 'Dizziness'],
    'Respiratory': ['Cough', 'Shortness of breath', 'Sore throat', 'Runny nose', 'Wheezing'],
    'Neurological': ['Headache', 'Memory problems', 'Mood changes', 'Difficulty sleeping'],
    'Digestive': ['Nausea', 'Vomiting', 'Diarrhea', 'Abdominal pain', 'Constipation'],
    'Musculoskeletal': ['Muscle aches', 'Joint pain', 'Back pain', 'Chest pain'],
    'Other': ['Skin rash', 'Blurred vision', 'Rapid heartbeat', 'Increased urination']
  };

  // Simulate analysis progress
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + Math.random() * 15;
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAnalysisProgress(0);
    }
  }, [isLoading]);

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
      {/* Input Method Selector */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={inputMethod === 'freetext' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMethod('freetext')}
          className="flex items-center gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Natural Language
        </Button>
        <Button
          variant={inputMethod === 'quick' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMethod('quick')}
          className="flex items-center gap-2"
        >
          <Zap className="h-4 w-4" />
          Quick Picker
        </Button>
        <Button
          variant={inputMethod === 'guided' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInputMethod('guided')}
          className="flex items-center gap-2"
        >
          <Search className="h-4 w-4" />
          Guided Questions
        </Button>
      </div>

      {/* Analysis Progress */}
      {isLoading && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Brain className="h-5 w-5 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">Analyzing with Advanced Bayesian AI...</span>
            </div>
            <Progress value={analysisProgress} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">
              Processing {selectedSymptoms.length + (input ? 1 : 0)} symptoms • Confidence: {Math.round(analysisProgress)}%
            </div>
          </CardContent>
        </Card>
      )}

      {/* Free Text Input */}
      {inputMethod === 'freetext' && (
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Advanced NLP • Understands natural language, typos, and medical terms</span>
              </div>
              
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={placeholder}
                  className="min-h-[120px] pr-12 resize-none border-primary/20 focus:border-primary/50"
                  disabled={isLoading}
                />
                
                <div className="absolute bottom-2 right-2 flex gap-1">
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
      )}

      {/* Quick Symptom Picker */}
      {inputMethod === 'quick' && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Plus className="h-4 w-4" />
                Quick Symptom Selection
              </div>
              
              {Object.entries(symptomCategories).map(([category, symptoms]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {symptoms.map((symptom) => (
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
              ))}
              
              {selectedSymptoms.length > 0 && (
                <div className="pt-2">
                  <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
                    Analyze {selectedSymptoms.length} Symptoms
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Symptoms Summary */}
      {selectedSymptoms.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-primary">
                  Selected Symptoms ({selectedSymptoms.length})
                </div>
                <div className="text-xs text-muted-foreground">
                  Confidence: {Math.round((selectedSymptoms.length / 10) * 100)}%
                </div>
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
              {inputMethod !== 'quick' && (
                <Button 
                  onClick={handleSubmit} 
                  disabled={isLoading}
                  size="sm"
                  className="w-full"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Run Bayesian Analysis
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};