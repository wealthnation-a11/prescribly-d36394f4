import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePageSEO } from '@/hooks/usePageSEO';
import { 
  Brain, 
  Stethoscope, 
  Heart, 
  Activity, 
  Pill, 
  AlertTriangle,
  Loader2,
  X,
  Plus,
  ArrowRight
} from 'lucide-react';

interface DiagnosisResult {
  condition: string;
  probability: number;
  description: string;
  drug_recommendations: any;
}

const WellnessChecker = () => {
  usePageSEO({
    title: "AI Wellness Checker - Prescribly",
    description: "Get instant AI-powered health analysis. Enter symptoms, get diagnosis suggestions and medication recommendations from our advanced Bayesian engine.",
    canonicalPath: "/wellness-checker"
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [currentSymptom, setCurrentSymptom] = useState('');
  const [duration, setDuration] = useState('');
  const [age, setAge] = useState<number>(25);
  const [gender, setGender] = useState('');
  const [consent, setConsent] = useState(false);
  
  // UI state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<DiagnosisResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Fetch symptom suggestions
  const fetchSuggestions = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_symptom_suggestions', {
        search_term: searchTerm
      });
      
      if (error) throw error;
      setSuggestions(data?.map((item: any) => item.symptom) || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  // Add symptom to list
  const addSymptom = (symptom: string) => {
    if (symptom && !symptoms.includes(symptom) && symptoms.length < 20) {
      setSymptoms([...symptoms, symptom]);
      setCurrentSymptom('');
      setSuggestions([]);
    }
  };

  // Remove symptom from list
  const removeSymptom = (symptom: string) => {
    setSymptoms(symptoms.filter(s => s !== symptom));
  };

  // Handle diagnosis
  const handleDiagnosis = async () => {
    if (!consent) {
      toast({
        title: "Consent Required",
        description: "Please consent to storing your wellness check data.",
        variant: "destructive"
      });
      return;
    }

    if (symptoms.length === 0) {
      toast({
        title: "Symptoms Required", 
        description: "Please add at least one symptom.",
        variant: "destructive"
      });
      return;
    }

    if (!duration || !gender) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('diagnose', {
        body: {
          symptoms,
          duration,
          age,
          gender,
          consent
        }
      });

      if (error) throw error;

      setResults(data.results);
      setShowResults(true);
      
      toast({
        title: "Analysis Complete",
        description: "Your wellness check results are ready."
      });
    } catch (error: any) {
      console.error('Diagnosis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze symptoms. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(currentSymptom);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [currentSymptom]);

  if (showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-background/50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">Prescribly</h1>
            <p className="text-xl text-muted-foreground">Analysis Results</p>
          </div>

          {/* Results */}
          <div className="space-y-6 mb-8">
            {results.map((result, index) => (
              <Card key={index} className="border-l-4 border-l-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{result.condition}</CardTitle>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {result.probability}%
                    </Badge>
                  </div>
                  <CardDescription className="text-base">
                    {result.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {result.drug_recommendations && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Pill className="h-4 w-4" />
                        Recommended Medications
                      </h4>
                      <div className="text-sm text-muted-foreground">
                        {typeof result.drug_recommendations === 'string' 
                          ? result.drug_recommendations
                          : JSON.stringify(result.drug_recommendations)
                        }
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Disclaimer */}
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    This is an AI-generated suggestion. Always consult a licensed medical professional before taking medication.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Accuracy: ~80% based on Bayesian model (internal validation)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 mt-8">
            <Button 
              onClick={() => navigate('/book-appointment')}
              className="flex-1"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Chat with a Doctor Now
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowResults(false);
                setResults([]);
                setSymptoms([]);
                setCurrentSymptom('');
                setDuration('');
                setGender('');
                setConsent(false);
              }}
            >
              New Check
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-background/50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-3 bg-primary/10 rounded-full">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <div className="p-3 bg-primary/10 rounded-full">
              <Stethoscope className="h-8 w-8 text-primary" />
            </div>
            <div className="p-3 bg-primary/10 rounded-full">
              <Heart className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-primary mb-4">Prescribly</h1>
          <p className="text-2xl text-muted-foreground mb-6">Doctor in Your Pocket</p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Hi, I'm your AI Wellness Checker. Let's figure out what's going on with your health.
          </p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Health Assessment
            </CardTitle>
            <CardDescription>
              Enter your symptoms and basic information for AI-powered diagnosis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Symptom Input */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Symptoms or Conditions
              </label>
              <div className="relative">
                <Input
                  placeholder="Type symptoms (e.g., fever, cough, headache)..."
                  value={currentSymptom}
                  onChange={(e) => setCurrentSymptom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && currentSymptom.trim()) {
                      addSymptom(currentSymptom.trim());
                    }
                  }}
                />
                {currentSymptom.trim() && (
                  <Button
                    type="button"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => addSymptom(currentSymptom.trim())}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="mt-2 border rounded-md bg-background">
                  {suggestions.slice(0, 5).map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                      onClick={() => addSymptom(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Selected Symptoms */}
              {symptoms.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {symptoms.map((symptom, index) => (
                    <Badge key={index} variant="secondary" className="py-1">
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
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Maximum 20 symptoms. You have {symptoms.length}/20.
              </p>
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-medium mb-2 block">Duration</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="How long have you had these symptoms?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">A few hours</SelectItem>
                  <SelectItem value="1-2-days">1-2 days</SelectItem>
                  <SelectItem value="3-7-days">3-7 days</SelectItem>
                  <SelectItem value="1-2-weeks">1-2 weeks</SelectItem>
                  <SelectItem value="weeks">Several weeks</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Age */}
            <div>
              <label className="text-sm font-medium mb-2 block">Age</label>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value) || 25)}
                min={1}
                max={120}
                placeholder="Your age"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="text-sm font-medium mb-2 block">Gender</label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Consent */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(checked) => setConsent(!!checked)}
              />
              <label
                htmlFor="consent"
                className="text-sm leading-relaxed cursor-pointer"
              >
                I consent to storing this wellness check to improve my care experience
              </label>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleDiagnosis}
              disabled={isLoading || !consent || symptoms.length === 0}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  AI Brain Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5 mr-2" />
                  Get AI Diagnosis
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WellnessChecker;