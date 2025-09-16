import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Plus, X, History, Stethoscope, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SymptomEntryScreenProps {
  onSubmit: (symptoms: string[]) => void;
  onViewHistory: () => void;
  loading?: boolean;
}

export const SymptomEntryScreen: React.FC<SymptomEntryScreenProps> = ({
  onSubmit,
  onViewHistory,
  loading = false
}) => {
  const [freeText, setFreeText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [suggestedSymptoms, setSuggestedSymptoms] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Debounced search for symptoms
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_symptom_suggestions', {
          search_term: searchTerm
        });

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error('Error searching symptoms:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const analyzeFreeText = async () => {
    if (!freeText.trim()) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-symptoms', {
        body: {
          text: freeText.trim(),
          locale: 'en'
        }
      });

      if (error) throw error;

      const { symptoms } = data;
      if (symptoms && symptoms.length > 0) {
        const symptomNames = symptoms.map((s: any) => s.name);
        setSuggestedSymptoms(symptomNames);
        toast.success(`Found ${symptoms.length} potential symptoms`);
      } else {
        toast.info('No specific symptoms detected. Try adding symptoms manually.');
      }
    } catch (error) {
      console.error('Error analyzing text:', error);
      toast.error('Unable to analyze your text. Please try adding symptoms manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addSymptom = (symptom: string) => {
    if (!selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const removeSymptom = (symptom: string) => {
    setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
  };

  const handleSubmit = () => {
    if (selectedSymptoms.length === 0) {
      toast.error('Please select at least one symptom to continue.');
      return;
    }
    onSubmit(selectedSymptoms);
  };

  const commonSymptoms = [
    'Headache', 'Fever', 'Cough', 'Sore throat', 'Fatigue', 'Nausea',
    'Vomiting', 'Diarrhea', 'Chest pain', 'Shortness of breath',
    'Abdominal pain', 'Back pain', 'Dizziness', 'Muscle aches'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Stethoscope className="h-16 w-16 text-primary mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-2">Describe Your Symptoms</h2>
        <p className="text-muted-foreground text-lg">
          Tell us what you're experiencing to get an accurate analysis
        </p>
      </motion.div>

      {/* Free Text Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Describe in Your Own Words
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Describe your symptoms in detail. For example: 'I have a severe headache that started this morning, along with nausea and sensitivity to light...'"
            className="min-h-[120px] resize-none"
            disabled={isAnalyzing}
          />
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{freeText.length}/1000 characters</span>
            <Button
              onClick={analyzeFreeText}
              disabled={!freeText.trim() || isAnalyzing}
              variant="outline"
              size="sm"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Analyze Text
                </>
              )}
            </Button>
          </div>

          {suggestedSymptoms.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Detected symptoms:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedSymptoms.map((symptom) => (
                  <Badge
                    key={symptom}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-white"
                    onClick={() => addSymptom(symptom)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {symptom}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Symptom Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Search & Add Symptoms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for specific symptoms..."
              className="pr-10"
            />
            {searchLoading && (
              <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3 text-muted-foreground" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
              {searchResults.map((result) => (
                <div
                  key={result.symptom}
                  className="p-2 hover:bg-muted rounded cursor-pointer text-sm"
                  onClick={() => addSymptom(result.symptom)}
                >
                  {result.symptom}
                </div>
              ))}
            </div>
          )}

          {/* Common Symptoms */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Common symptoms:</p>
            <div className="flex flex-wrap gap-2">
              {commonSymptoms.map((symptom) => (
                <Badge
                  key={symptom}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-white"
                  onClick={() => addSymptom(symptom)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {symptom}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Symptoms */}
      {selectedSymptoms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Symptoms ({selectedSymptoms.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedSymptoms.map((symptom) => (
                <Badge
                  key={symptom}
                  className="bg-primary text-white"
                >
                  {symptom}
                  <button
                    onClick={() => removeSymptom(symptom)}
                    className="ml-2 hover:bg-primary-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={onViewHistory}
          className="flex-1"
        >
          <History className="h-4 w-4 mr-2" />
          View History
        </Button>
        
        <Button
          onClick={handleSubmit}
          disabled={selectedSymptoms.length === 0 || loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Continue to Questions
            </>
          )}
        </Button>
      </div>
    </div>
  );
};