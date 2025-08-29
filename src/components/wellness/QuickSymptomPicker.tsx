import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Zap, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';

interface Symptom {
  id: string;
  name: string;
  description?: string;
}

interface QuickSymptomPickerProps {
  onContinue: (selectedSymptoms: string[]) => void;
  onBack: () => void;
}

const defaultSymptoms = [
  'headache', 'fever', 'cough', 'sore throat', 'fatigue', 
  'nausea', 'chest pain', 'dizziness', 'abdominal pain', 'diarrhea'
];

export const QuickSymptomPicker: React.FC<QuickSymptomPickerProps> = ({
  onContinue,
  onBack
}) => {
  const { t } = useLanguage();
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [filteredSymptoms, setFilteredSymptoms] = useState<Symptom[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSymptoms();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = symptoms.filter(symptom =>
        symptom.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSymptoms(filtered);
    } else {
      setFilteredSymptoms(symptoms.slice(0, 20)); // Show first 20 symptoms
    }
  }, [searchTerm, symptoms]);

  const loadSymptoms = async () => {
    try {
      const { data, error } = await supabase
        .from('symptoms')
        .select('id, name, description')
        .order('name');

      if (error) throw error;

      if (data && data.length > 0) {
        setSymptoms(data);
        setFilteredSymptoms(data.slice(0, 20));
      } else {
        // Fallback to default symptoms
        const fallbackSymptoms: Symptom[] = defaultSymptoms.map((name, index) => ({
          id: `fallback-${index}`,
          name,
          description: `Common symptom: ${name}`
        }));
        setSymptoms(fallbackSymptoms);
        setFilteredSymptoms(fallbackSymptoms);
      }
    } catch (error) {
      console.error('Error loading symptoms:', error);
      // Use fallback symptoms
      const fallbackSymptoms: Symptom[] = defaultSymptoms.map((name, index) => ({
        id: `fallback-${index}`,
        name,
        description: `Common symptom: ${name}`
      }));
      setSymptoms(fallbackSymptoms);
      setFilteredSymptoms(fallbackSymptoms);
    } finally {
      setLoading(false);
    }
  };

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptomId) 
        ? prev.filter(id => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const removeSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev => prev.filter(id => id !== symptomId));
  };

  const handleContinue = () => {
    if (selectedSymptoms.length > 0) {
      onContinue(selectedSymptoms);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Symptom Picker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search symptoms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected symptoms */}
          {selectedSymptoms.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Selected symptoms:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedSymptoms.map(symptomId => {
                  const symptom = symptoms.find(s => s.id === symptomId);
                  return symptom ? (
                    <Badge
                      key={symptomId}
                      variant="default"
                      className="bg-primary text-primary-foreground"
                    >
                      {symptom.name}
                      <button
                        onClick={() => removeSymptom(symptomId)}
                        className="ml-2 hover:bg-primary-foreground/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Available symptoms */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Available symptoms:</h4>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {filteredSymptoms
                  .filter(symptom => !selectedSymptoms.includes(symptom.id))
                  .map(symptom => (
                    <button
                      key={symptom.id}
                      onClick={() => toggleSymptom(symptom.id)}
                      className="text-left p-2 rounded-lg border border-muted hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <div className="font-medium text-sm">{symptom.name}</div>
                      {symptom.description && (
                        <div className="text-xs text-muted-foreground">
                          {symptom.description}
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {filteredSymptoms.length === 0 && searchTerm && !loading && (
            <p className="text-center text-muted-foreground py-4">
              No symptoms found matching "{searchTerm}"
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={selectedSymptoms.length === 0}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          Continue ({selectedSymptoms.length} selected)
        </Button>
      </div>
    </motion.div>
  );
};