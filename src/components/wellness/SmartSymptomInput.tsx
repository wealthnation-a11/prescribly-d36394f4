import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { 
  Send, 
  Mic, 
  Plus,
  X,
  Sparkles,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SmartSymptomInputProps {
  onSymptomSubmit: (symptoms: string[]) => void;
  isLoading?: boolean;
}

interface SymptomSuggestion {
  id: string;
  name: string;
  category: string;
}

export const SmartSymptomInput: React.FC<SmartSymptomInputProps> = ({
  onSymptomSubmit,
  isLoading = false,
}) => {
  const [freeTextInput, setFreeTextInput] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SymptomSuggestion[]>([]);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Common symptoms with categories
  const commonSymptoms = [
    { id: '1', name: 'Fever', category: 'General' },
    { id: '2', name: 'Headache', category: 'Neurological' },
    { id: '3', name: 'Cough', category: 'Respiratory' },
    { id: '4', name: 'Sore throat', category: 'Respiratory' },
    { id: '5', name: 'Nausea', category: 'Gastrointestinal' },
    { id: '6', name: 'Fatigue', category: 'General' },
    { id: '7', name: 'Dizziness', category: 'Neurological' },
    { id: '8', name: 'Joint pain', category: 'Musculoskeletal' },
    { id: '9', name: 'Chest pain', category: 'Cardiovascular' },
    { id: '10', name: 'Abdominal pain', category: 'Gastrointestinal' },
    { id: '11', name: 'Shortness of breath', category: 'Respiratory' },
    { id: '12', name: 'Back pain', category: 'Musculoskeletal' },
    { id: '13', name: 'Vomiting', category: 'Gastrointestinal' },
    { id: '14', name: 'Diarrhea', category: 'Gastrointestinal' },
    { id: '15', name: 'Rash', category: 'Dermatological' },
  ];

  // Filter suggestions based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = commonSymptoms.filter(symptom =>
        symptom.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !selectedSymptoms.includes(symptom.name)
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, selectedSymptoms]);

  const handleSubmit = () => {
    const allSymptoms = [...selectedSymptoms];
    
    // Add free text as symptoms if provided
    if (freeTextInput.trim()) {
      allSymptoms.push(freeTextInput.trim());
    }
    
    if (allSymptoms.length === 0) return;
    
    onSymptomSubmit(allSymptoms);
  };

  const toggleSymptom = (symptomName: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptomName) 
        ? prev.filter(s => s !== symptomName)
        : [...prev, symptomName]
    );
    setSearchQuery('');
  };

  const removeSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => prev.filter(s => s !== symptom));
  };

  const addSuggestion = (symptom: SymptomSuggestion) => {
    toggleSymptom(symptom.name);
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
        setFreeTextInput(prev => prev + (prev ? ' ' : '') + transcript);
      };
      
      recognition.start();
    }
  };

  const groupedSymptoms = commonSymptoms.reduce((acc, symptom) => {
    if (!acc[symptom.category]) {
      acc[symptom.category] = [];
    }
    acc[symptom.category].push(symptom);
    return acc;
  }, {} as Record<string, typeof commonSymptoms>);

  return (
    <div className="space-y-6">
      {/* Free Text Input */}
      <Card className="border-primary/20 shadow-lg">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Describe your symptoms naturally - our AI will understand</span>
            </div>
            
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={freeTextInput}
                onChange={(e) => setFreeTextInput(e.target.value)}
                placeholder="Tell us how you're feeling... (e.g., 'I have a headache and feel dizzy since this morning')"
                className="min-h-[120px] pr-12 resize-none border-primary/20 focus:border-primary/50 text-base"
                disabled={isLoading}
              />
              
              <div className="absolute bottom-3 right-3 flex gap-2">
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Search & Quick Add */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Search className="h-4 w-4" />
              Search & Add Specific Symptoms
            </div>
            
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for symptoms..."
                className="border-primary/20 focus:border-primary/50"
              />
              
              {/* Search Suggestions */}
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full mt-2 w-full bg-background border border-primary/20 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
                >
                  {suggestions.map((symptom) => (
                    <button
                      key={symptom.id}
                      onClick={() => addSuggestion(symptom)}
                      className="w-full text-left px-4 py-3 hover:bg-primary/5 flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-medium">{symptom.name}</div>
                        <div className="text-xs text-muted-foreground">{symptom.category}</div>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Symptoms by Category */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Plus className="h-4 w-4" />
              Quick Add Common Symptoms
            </div>
            
            <div className="space-y-4">
              {Object.entries(groupedSymptoms).map(([category, symptoms]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
                  <div className="flex flex-wrap gap-2">
                    {symptoms.map((symptom) => (
                      <Badge
                        key={symptom.id}
                        variant={selectedSymptoms.includes(symptom.name) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => toggleSymptom(symptom.name)}
                      >
                        {symptom.name}
                        {selectedSymptoms.includes(symptom.name) && (
                          <X className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Symptoms Summary */}
      {selectedSymptoms.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="space-y-3">
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
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Submit Button */}
      <Button 
        onClick={handleSubmit}
        disabled={isLoading || (selectedSymptoms.length === 0 && !freeTextInput.trim())}
        className="w-full h-12 text-base font-medium"
        size="lg"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full"></div>
            Analyzing Symptoms...
          </div>
        ) : (
          <>
            <Send className="h-5 w-5 mr-2" />
            Run AI Diagnosis
          </>
        )}
      </Button>
    </div>
  );
};