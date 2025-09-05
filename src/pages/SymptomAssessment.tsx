import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { usePageSEO } from '@/hooks/usePageSEO';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  MessageCircle, 
  Zap, 
  Navigation, 
  Mic, 
  Send, 
  ArrowLeft, 
  ArrowRight,
  Save,
  Stethoscope,
  Pill,
  AlertTriangle,
  History,
  User,
  Calendar,
  MapPin,
  Activity,
  Clock
} from 'lucide-react';

interface ParsedSymptom {
  id: string;
  name: string;
  score: number;
}

interface DiagnosisResult {
  condition_id: number;
  name: string;
  description: string;
  probability: number;
  drug_name: string;
  dosage: string;
  notes: string;
}

interface HistoryItem {
  id: string;
  user_id: string;
  input_text?: string;
  parsed_symptoms?: string[];
  suggested_conditions?: DiagnosisResult[];
  confirmed_condition?: string;
  symptoms?: string[];
  diagnosis?: string;
  drug: string;
  dosage: string;
  notes?: string;
  instructions?: string;
  precautions?: string;
  created_at: string;
}

type EntryMode = 'selection' | 'free-text' | 'symptom-picker' | 'guided' | 'results' | 'history';
type GuidedStep = 'age' | 'gender' | 'duration' | 'severity' | 'location' | 'risk-factors' | 'specific';

const SymptomAssessment = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<EntryMode>('selection');
  const [loading, setLoading] = useState(false);
  
  // Free text state
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  // Symptom picker state
  const [availableSymptoms, setAvailableSymptoms] = useState<any[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  
  // Guided questions state
  const [guidedStep, setGuidedStep] = useState<GuidedStep>('age');
  const [guidedAnswers, setGuidedAnswers] = useState<Record<string, any>>({});
  
  // Results state
  const [results, setResults] = useState<DiagnosisResult[]>([]);
  const [parsedSymptoms, setParsedSymptoms] = useState<ParsedSymptom[]>([]);
  
  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);

  usePageSEO({
    title: 'Prescribly | Symptom Assessment - Smarter than Ada Health',
    description: 'Advanced AI symptom assessment with Bayesian diagnosis across 1,200+ conditions. Get instant medical analysis and prescription recommendations.'
  });

  const defaultSymptoms = [
    'fever', 'cough', 'nausea', 'headache', 'chest pain', 'sore throat',
    'fatigue', 'dizziness', 'stomach pain', 'shortness of breath'
  ];

  useEffect(() => {
    loadAvailableSymptoms();
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadAvailableSymptoms = async () => {
    try {
      const { data, error } = await supabase
        .from('symptoms')
        .select('id, name, description')
        .limit(50);

      if (error) throw error;
      setAvailableSymptoms(data || []);
    } catch (error) {
      console.error('Error loading symptoms:', error);
      // Use default symptoms as fallback
      const fallbackSymptoms = defaultSymptoms.map((name, index) => ({
        id: `default-${index}`,
        name,
        description: `Common symptom: ${name}`
      }));
      setAvailableSymptoms(fallbackSymptoms);
    }
  };

  const loadHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_diagnosis_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleFreeTextSubmit = async () => {
    if (!inputText.trim()) return;
    
    setLoading(true);
    try {
      // Parse symptoms from text
      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-symptoms', {
        body: { text: inputText, locale: 'en' }
      });

      if (parseError) throw parseError;
      
      const symptoms = parseData.symptoms || [];
      setParsedSymptoms(symptoms);

      if (symptoms.length === 0) {
        toast({
          title: "No symptoms found",
          description: "Let's try the guided questions instead.",
          variant: "default",
        });
        setMode('guided');
        return;
      }

      // Get diagnosis
      const symptomIds = symptoms.map((s: ParsedSymptom) => s.id);
      const { data: diagnosisData, error: diagnosisError } = await supabase.functions.invoke('diagnose-with-bayesian', {
        body: { symptomIds }
      });

      if (diagnosisError) throw diagnosisError;
      
      setResults(diagnosisData || []);
      setMode('results');

    } catch (error) {
      console.error('Error processing free text:', error);
      toast({
        title: "Processing failed",
        description: "Please try again or use the guided questions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSymptomPickerSubmit = async () => {
    if (selectedSymptoms.length === 0) return;
    
    setLoading(true);
    try {
      const { data: diagnosisData, error } = await supabase.functions.invoke('diagnose-with-bayesian', {
        body: { symptomIds: selectedSymptoms }
      });

      if (error) throw error;
      
      setResults(diagnosisData || []);
      setMode('results');
    } catch (error) {
      console.error('Error processing symptom picker:', error);
      toast({
        title: "Diagnosis failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuidedComplete = async () => {
    const symptoms = guidedAnswers.symptoms || [];
    if (symptoms.length === 0) return;

    setLoading(true);
    try {
      const { data: diagnosisData, error } = await supabase.functions.invoke('diagnose-with-bayesian', {
        body: { 
          symptomIds: symptoms,
          age: guidedAnswers.age,
          gender: guidedAnswers.gender
        }
      });

      if (error) throw error;
      
      setResults(diagnosisData || []);
      setMode('results');
    } catch (error) {
      console.error('Error processing guided assessment:', error);
      toast({
        title: "Assessment failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = async (result: DiagnosisResult) => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('log-history', {
        body: {
          user_id: user.id,
          input_text: inputText || 'Symptom picker or guided assessment',
          parsed_symptoms: parsedSymptoms.map(s => s.name),
          suggested_conditions: results,
          confirmed_condition: result.name,
          drug: result.drug_name,
          dosage: result.dosage,
          notes: result.notes
        }
      });

      if (error) throw error;
      
      toast({
        title: "Saved to history",
        description: "This assessment has been saved to your medical history.",
      });
      
      loadHistory();
    } catch (error) {
      console.error('Error saving to history:', error);
      toast({
        title: "Save failed",
        description: "Could not save to history. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice input.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(prev => prev + ' ' + transcript);
    };

    recognition.onerror = () => {
      toast({
        title: "Voice input failed",
        description: "Please try typing instead.",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptomId) 
        ? prev.filter(id => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const renderEntrySelection = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Stethoscope className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Symptom Assessment
          </h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Smarter, faster, safer than Ada Health
        </p>
        <p className="text-sm text-muted-foreground">
          Advanced AI diagnosis across 1,200+ medical conditions
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/50" onClick={() => setMode('free-text')}>
          <CardHeader className="text-center">
            <MessageCircle className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle className="text-lg">💬 Free Description</CardTitle>
            <CardDescription>
              Describe your symptoms in your own words
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Natural language processing with voice input support
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/50" onClick={() => setMode('symptom-picker')}>
          <CardHeader className="text-center">
            <Zap className="h-12 w-12 text-accent mx-auto mb-2" />
            <CardTitle className="text-lg">⚡ Symptom Picker</CardTitle>
            <CardDescription>
              Quick selection from common symptoms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Multi-select interface for rapid assessment
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/50" onClick={() => setMode('guided')}>
          <CardHeader className="text-center">
            <Navigation className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <CardTitle className="text-lg">🧭 Guided Questions</CardTitle>
            <CardDescription>
              Step-by-step comprehensive assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Clinical-grade questionnaire with context
            </p>
          </CardContent>
        </Card>
      </div>

      {history.length > 0 && (
        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => setMode('history')} className="gap-2">
            <History className="h-4 w-4" />
            View Assessment History ({history.length})
          </Button>
        </div>
      )}
    </div>
  );

  const renderFreeText = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Describe Your Symptoms
        </CardTitle>
        <CardDescription>
          Tell us how you're feeling in your own words
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="e.g., I have a severe headache and feel nauseous. The pain started this morning and gets worse with light..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={4}
          className="resize-none"
        />
        
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>{inputText.length}/500 characters</span>
          <span>Press Ctrl+Enter to submit</span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={startVoiceInput}
            disabled={isListening}
            className="gap-2"
          >
            <Mic className={`h-4 w-4 ${isListening ? 'text-red-500' : ''}`} />
            {isListening ? 'Listening...' : 'Voice Input'}
          </Button>
        </div>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => setMode('selection')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={handleFreeTextSubmit} 
            disabled={!inputText.trim() || loading}
            className="gap-2"
          >
            {loading ? (
              <>Processing...</>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Analyze Symptoms
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSymptomPicker = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Select Your Symptoms
        </CardTitle>
        <CardDescription>
          Choose from common symptoms below
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedSymptoms.length > 0 && (
          <div className="space-y-2">
            <Label>Selected symptoms ({selectedSymptoms.length}):</Label>
            <div className="flex flex-wrap gap-2">
              {selectedSymptoms.map(symptomId => {
                const symptom = availableSymptoms.find(s => s.id === symptomId);
                return symptom ? (
                  <Badge key={symptomId} variant="default" className="cursor-pointer" onClick={() => toggleSymptom(symptomId)}>
                    {symptom.name} ×
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <Label>Available symptoms:</Label>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {availableSymptoms.map(symptom => (
              <Badge
                key={symptom.id}
                variant={selectedSymptoms.includes(symptom.id) ? "default" : "outline"}
                className="cursor-pointer justify-start p-2 text-left"
                onClick={() => toggleSymptom(symptom.id)}
              >
                {symptom.name}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="ghost" onClick={() => setMode('selection')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={handleSymptomPickerSubmit} 
            disabled={selectedSymptoms.length === 0 || loading}
            className="gap-2"
          >
            {loading ? (
              <>Processing...</>
            ) : (
              <>
                Analyze ({selectedSymptoms.length} symptoms)
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderGuidedQuestions = () => {
    const steps: GuidedStep[] = ['age', 'gender', 'duration', 'severity', 'location', 'risk-factors', 'specific'];
    const currentStepIndex = steps.indexOf(guidedStep);
    const progress = ((currentStepIndex + 1) / steps.length) * 100;

    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Guided Assessment
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>
        <CardContent className="space-y-6">
          {guidedStep === 'age' && (
            <div className="space-y-4">
              <Label className="text-lg">What is your age?</Label>
              <div className="space-y-2">
                <Slider
                  value={[guidedAnswers.age || 25]}
                  onValueChange={(value) => setGuidedAnswers(prev => ({ ...prev, age: value[0] }))}
                  max={100}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="text-center text-lg font-semibold">
                  {guidedAnswers.age || 25} years old
                </div>
              </div>
            </div>
          )}

          {guidedStep === 'gender' && (
            <div className="space-y-4">
              <Label className="text-lg">What is your gender?</Label>
              <RadioGroup
                value={guidedAnswers.gender || ''}
                onValueChange={(value) => setGuidedAnswers(prev => ({ ...prev, gender: value }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Female</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Other</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {guidedStep === 'specific' && (
            <div className="space-y-4">
              <Label className="text-lg">Select your specific symptoms:</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {availableSymptoms.slice(0, 20).map(symptom => (
                  <Badge
                    key={symptom.id}
                    variant={(guidedAnswers.symptoms || []).includes(symptom.id) ? "default" : "outline"}
                    className="cursor-pointer justify-start p-2 text-left"
                    onClick={() => {
                      const currentSymptoms = guidedAnswers.symptoms || [];
                      const newSymptoms = currentSymptoms.includes(symptom.id)
                        ? currentSymptoms.filter((id: string) => id !== symptom.id)
                        : [...currentSymptoms, symptom.id];
                      setGuidedAnswers(prev => ({ ...prev, symptoms: newSymptoms }));
                    }}
                  >
                    {symptom.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button 
              variant="ghost" 
              onClick={() => {
                if (currentStepIndex === 0) {
                  setMode('selection');
                } else {
                  setGuidedStep(steps[currentStepIndex - 1]);
                }
              }}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {currentStepIndex === 0 ? 'Back to Menu' : 'Previous'}
            </Button>
            
            <Button 
              onClick={() => {
                if (currentStepIndex === steps.length - 1) {
                  handleGuidedComplete();
                } else {
                  setGuidedStep(steps[currentStepIndex + 1]);
                }
              }}
              disabled={
                loading ||
                (guidedStep === 'age' && !guidedAnswers.age) ||
                (guidedStep === 'gender' && !guidedAnswers.gender) ||
                (guidedStep === 'specific' && (!guidedAnswers.symptoms || guidedAnswers.symptoms.length === 0))
              }
              className="gap-2"
            >
              {loading ? (
                'Processing...'
              ) : currentStepIndex === steps.length - 1 ? (
                <>Complete Assessment</>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderResults = () => {
    if (results.length === 0) {
      return (
        <Card className="max-w-2xl mx-auto text-center">
          <CardContent className="py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Clear Diagnosis</h3>
            <p className="text-muted-foreground mb-4">
              We couldn't find a clear match for your symptoms. This could indicate a rare condition or complex case.
            </p>
            <Button onClick={() => setMode('selection')}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    const topResult = results[0];
    const otherResults = results.slice(1);

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Top Condition Card */}
        <Card className="border-primary/50 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl text-primary">{topResult.name}</CardTitle>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(topResult.probability * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Confidence</div>
              </div>
            </div>
            <Progress value={topResult.probability * 100} className="w-full" />
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="text-muted-foreground">{topResult.description}</p>
            
            <div className="bg-background/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <Pill className="h-5 w-5" />
                <span className="font-semibold">Recommended Treatment</span>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">MEDICATION</Label>
                  <p className="font-medium">{topResult.drug_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">DOSAGE</Label>
                  <p className="font-medium">{topResult.dosage}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">INSTRUCTIONS</Label>
                  <p className="font-medium">{topResult.notes}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 mb-1">Medical Disclaimer</p>
                  <p className="text-yellow-700">
                    This is an AI-generated assessment and is not a medical diagnosis. 
                    Always consult with a qualified healthcare professional before starting any treatment.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={() => saveToHistory(topResult)} className="gap-2">
                <Save className="h-4 w-4" />
                Save to History
              </Button>
              <Button variant="outline" className="gap-2">
                <User className="h-4 w-4" />
                Consult a Doctor
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Other Suggested Conditions */}
        {otherResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Other Possible Conditions</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {otherResults.map((result, index) => (
                <Card key={result.condition_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{result.name}</h4>
                      <span className="text-sm font-medium text-muted-foreground">
                        {Math.round(result.probability * 100)}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {result.description}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Treatment:</span> {result.drug_name}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <Button variant="outline" onClick={() => setMode('selection')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            New Assessment
          </Button>
        </div>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6" />
          Assessment History
        </h2>
        <Button variant="outline" onClick={() => setMode('selection')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Assessment
        </Button>
      </div>

      {history.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No History Yet</h3>
            <p className="text-muted-foreground mb-4">
              Complete your first assessment to start building your medical history.
            </p>
            <Button onClick={() => setMode('selection')}>
              Start Assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {history.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">{item.confirmed_condition || item.diagnosis}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.input_text?.substring(0, 100) || 'Assessment completed'}...
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                {item.drug && (
                  <div className="bg-background/50 rounded p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Pill className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Treatment</span>
                    </div>
                    <p><strong>Medication:</strong> {item.drug}</p>
                    <p><strong>Dosage:</strong> {item.dosage}</p>
                    {item.notes && <p><strong>Notes:</strong> {item.notes}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-6xl mx-auto py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {mode === 'selection' && renderEntrySelection()}
            {mode === 'free-text' && renderFreeText()}
            {mode === 'symptom-picker' && renderSymptomPicker()}
            {mode === 'guided' && renderGuidedQuestions()}
            {mode === 'results' && renderResults()}
            {mode === 'history' && renderHistory()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SymptomAssessment;
