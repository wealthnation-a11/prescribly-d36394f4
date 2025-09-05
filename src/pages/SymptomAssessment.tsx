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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="text-center border-dashed border-2 border-muted-foreground/20">
            <CardContent className="py-12">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
              </motion.div>
              <h3 className="text-2xl font-bold mb-3">No Clear Diagnosis Found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We couldn't find a clear match for your symptoms. This could indicate a rare condition, 
                complex case, or the need for more specific information.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => setMode('guided')} className="gap-2">
                  <Navigation className="h-4 w-4" />
                  Try Guided Questions
                </Button>
                <Button variant="outline" onClick={() => setMode('selection')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Start Over
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      );
    }

    const topResult = results[0];
    const otherResults = results.slice(1, 3); // Show top 3 total
    const isUrgent = topResult.probability > 0.8 || topResult.name.toLowerCase().includes('emergency') || 
                     topResult.name.toLowerCase().includes('urgent') || topResult.name.toLowerCase().includes('severe');

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 max-w-5xl mx-auto"
      >
        {/* Urgent Alert Banner */}
        {isUrgent && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-4 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="bg-red-500 rounded-full p-2 animate-pulse">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-red-800">High Confidence Match Detected</h4>
                <p className="text-red-700 text-sm">
                  Consider consulting a healthcare professional for proper evaluation.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Top Condition - Hero Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={`relative overflow-hidden shadow-xl ${isUrgent ? 'border-red-200 ring-2 ring-red-100' : 'border-primary/30'}`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            
            <CardHeader className="relative">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-full ${isUrgent ? 'bg-red-100' : 'bg-primary/10'}`}>
                      <Stethoscope className={`h-6 w-6 ${isUrgent ? 'text-red-600' : 'text-primary'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-2xl lg:text-3xl font-bold">
                        {topResult.name}
                      </CardTitle>
                      {isUrgent && (
                        <Badge variant="destructive" className="mt-1">
                          High Priority
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Probability Display */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Confidence Level</span>
                      <span className={`text-2xl font-bold ${isUrgent ? 'text-red-600' : 'text-primary'}`}>
                        {Math.round(topResult.probability * 100)}%
                      </span>
                    </div>
                    <div className="relative">
                      <Progress 
                        value={topResult.probability * 100} 
                        className={`h-3 ${isUrgent ? '[&>div]:bg-red-500' : ''}`} 
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${topResult.probability * 100}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/20 to-accent/20 rounded-full"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Low</span>
                      <span>Moderate</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-6">
              {/* Description */}
              <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 border">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  About This Condition
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  {topResult.description || "A medical condition that matches your reported symptoms."}
                </p>
              </div>

              {/* Treatment Recommendation */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-5 border border-green-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-green-500 rounded-full p-2">
                    <Pill className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-bold text-green-800">Recommended Treatment</h4>
                </div>
                
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-white/70 rounded-lg p-3 border border-green-100">
                    <Label className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                      Medication
                    </Label>
                    <p className="font-bold text-green-900 mt-1">
                      {topResult.drug_name || 'Consult healthcare provider'}
                    </p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-3 border border-green-100">
                    <Label className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                      Dosage
                    </Label>
                    <p className="font-bold text-green-900 mt-1">
                      {topResult.dosage || 'As prescribed'}
                    </p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-3 border border-green-100">
                    <Label className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                      Instructions
                    </Label>
                    <p className="font-bold text-green-900 mt-1 text-sm">
                      {topResult.notes || 'Follow medical advice'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  onClick={() => saveToHistory(topResult)} 
                  className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                >
                  <Save className="h-4 w-4" />
                  Save to My History
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2 border-green-200 text-green-700 hover:bg-green-50"
                >
                  <User className="h-4 w-4" />
                  Consult a Doctor
                </Button>
                <Button 
                  variant="ghost" 
                  className="gap-2"
                  onClick={() => {
                    // Save current state for "Continue Later"
                    if (user) {
                      localStorage.setItem(`assessment_${user.id}`, JSON.stringify({
                        results,
                        parsedSymptoms,
                        timestamp: Date.now()
                      }));
                    }
                    setMode('selection');
                  }}
                >
                  <Clock className="h-4 w-4" />
                  Continue Later
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Other Possible Conditions */}
        {otherResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent flex-1" />
              <h3 className="text-lg font-semibold text-muted-foreground px-4">
                Other Possible Conditions
              </h3>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent flex-1" />
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {otherResults.map((result, index) => (
                <motion.div
                  key={result.condition_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 hover:border-primary/40 group">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-lg group-hover:text-primary transition-colors">
                          {result.name}
                        </h4>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {Math.round(result.probability * 100)}%
                          </div>
                          <div className="text-xs text-muted-foreground">match</div>
                        </div>
                      </div>
                      
                      <Progress 
                        value={result.probability * 100} 
                        className="mb-3 h-2"
                      />
                      
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                        {result.description || "Additional condition that may match your symptoms."}
                      </p>
                      
                      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Pill className="h-3 w-3 text-green-600" />
                          <span className="font-medium">Treatment:</span>
                          <span className="text-muted-foreground">{result.drug_name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground ml-5">
                          {result.dosage} • {result.notes}
                        </div>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => saveToHistory(result)}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Medical Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="bg-yellow-500 rounded-full p-2 flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-yellow-800 mb-2">Important Medical Disclaimer</h4>
              <p className="text-yellow-700 text-sm leading-relaxed">
                This AI assessment is for informational purposes only and is not a substitute for professional 
                medical advice, diagnosis, or treatment. Always seek the advice of your physician or other 
                qualified health provider with any questions you may have regarding a medical condition.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-center pt-4">
          <Button 
            variant="outline" 
            onClick={() => setMode('selection')} 
            className="gap-2 px-8"
          >
            <ArrowLeft className="h-4 w-4" />
            New Assessment
          </Button>
        </div>
      </motion.div>
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
