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
  Search,
  Brain
} from 'lucide-react';
import { motion } from 'framer-motion';
import Player from 'react-lottie-player';

// Import Lottie animations
import heartbeatPulse from '@/assets/animations/heartbeat-pulse.json';
import medicalScan from '@/assets/animations/medical-scan.json';

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

  // Common symptoms with categories - expanded list
  const commonSymptoms = [
    // General symptoms
    { id: '1', name: 'Fever', category: 'General' },
    { id: '6', name: 'Fatigue', category: 'General' },    
    { id: '16', name: 'Chills', category: 'General' },
    { id: '17', name: 'Weakness', category: 'General' },
    { id: '18', name: 'Loss of appetite', category: 'General' },
    
    // Neurological symptoms
    { id: '2', name: 'Headache', category: 'Neurological' },
    { id: '7', name: 'Dizziness', category: 'Neurological' },
    { id: '19', name: 'Confusion', category: 'Neurological' },
    { id: '20', name: 'Memory problems', category: 'Neurological' },
    { id: '21', name: 'Seizures', category: 'Neurological' },
    
    // Respiratory symptoms
    { id: '3', name: 'Cough', category: 'Respiratory' },
    { id: '4', name: 'Sore throat', category: 'Respiratory' },
    { id: '11', name: 'Shortness of breath', category: 'Respiratory' },
    { id: '22', name: 'Runny nose', category: 'Respiratory' },
    { id: '23', name: 'Congestion', category: 'Respiratory' },
    { id: '24', name: 'Wheezing', category: 'Respiratory' },
    
    // Gastrointestinal symptoms
    { id: '5', name: 'Nausea', category: 'Gastrointestinal' },
    { id: '10', name: 'Abdominal pain', category: 'Gastrointestinal' },
    { id: '13', name: 'Vomiting', category: 'Gastrointestinal' },
    { id: '14', name: 'Diarrhea', category: 'Gastrointestinal' },
    { id: '25', name: 'Constipation', category: 'Gastrointestinal' },
    { id: '26', name: 'Heartburn', category: 'Gastrointestinal' },
    
    // Musculoskeletal symptoms
    { id: '8', name: 'Joint pain', category: 'Musculoskeletal' },
    { id: '12', name: 'Back pain', category: 'Musculoskeletal' },
    { id: '27', name: 'Muscle pain', category: 'Musculoskeletal' },
    { id: '28', name: 'Neck pain', category: 'Musculoskeletal' },
    { id: '29', name: 'Stiffness', category: 'Musculoskeletal' },
    
    // Cardiovascular symptoms
    { id: '9', name: 'Chest pain', category: 'Cardiovascular' },
    { id: '30', name: 'Palpitations', category: 'Cardiovascular' },
    { id: '31', name: 'Irregular heartbeat', category: 'Cardiovascular' },
    { id: '32', name: 'Swelling in legs', category: 'Cardiovascular' },
    
    // Dermatological symptoms
    { id: '15', name: 'Rash', category: 'Dermatological' },
    { id: '33', name: 'Itching', category: 'Dermatological' },
    { id: '34', name: 'Skin redness', category: 'Dermatological' },
    { id: '35', name: 'Dry skin', category: 'Dermatological' },
    
    // Eye/Ear symptoms
    { id: '36', name: 'Blurred vision', category: 'Eye/Ear' },
    { id: '37', name: 'Eye pain', category: 'Eye/Ear' },
    { id: '38', name: 'Ear pain', category: 'Eye/Ear' },
    { id: '39', name: 'Hearing loss', category: 'Eye/Ear' },
    
    // Urinary symptoms
    { id: '40', name: 'Frequent urination', category: 'Urinary' },
    { id: '41', name: 'Painful urination', category: 'Urinary' },
    { id: '42', name: 'Blood in urine', category: 'Urinary' },
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
      // Show all symptoms organized by category when no search query
      const unselected = commonSymptoms.filter(symptom => 
        !selectedSymptoms.includes(symptom.name)
      );
      setSuggestions(unselected);
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
  };

  const removeSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => prev.filter(s => s !== symptom));
  };

  const addSuggestion = (symptom: SymptomSuggestion) => {
    toggleSymptom(symptom.name);
    setSearchQuery(''); // Clear search and hide dropdown
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
                placeholder="Type to search symptoms..."
                className="border-primary/20 focus:border-primary/50"
              />
              
              {/* Search Suggestions Dropdown */}
              {searchQuery.trim() && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full mt-2 w-full bg-background border border-primary/20 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
                >
                  {suggestions.map((symptom) => (
                    <button
                      key={symptom.id}
                      onClick={() => addSuggestion(symptom)}
                      className="w-full text-left px-4 py-3 hover:bg-primary/5 flex items-center justify-between group border-b border-border/50 last:border-b-0"
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

      {/* Ready for Analysis Animation - Show when no symptoms */}
      {selectedSymptoms.length === 0 && !freeTextInput.trim() && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <div className="mx-auto mb-4 w-24 h-24 flex items-center justify-center">
            <Player
              play
              loop
              animationData={heartbeatPulse}
              style={{ height: '96px', width: '96px' }}
              className="opacity-60"
            />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground mb-2">Ready for Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Start by describing your symptoms or selecting from common conditions above
          </p>
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
            <Player
              play
              loop
              animationData={medicalScan}
              style={{ height: '20px', width: '20px' }}
            />
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