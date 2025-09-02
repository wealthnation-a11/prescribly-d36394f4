import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, 
  Zap, 
  Compass, 
  Heart,
  Shield,
  ArrowLeft,
  Stethoscope,
  Send,
  User,
  AlertTriangle,
  CheckCircle,
  Save,
  Brain,
  Clock,
  TrendingUp
} from 'lucide-react';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from 'react-router-dom';
import { usePageSEO } from '@/hooks/usePageSEO';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type FlowStep = 'entry' | 'free-text' | 'symptom-picker' | 'guided' | 'results';

interface DiagnosisResult {
  condition_id: number;
  name: string;
  description: string;
  probability: number;
  is_rare: boolean;
  explain: {
    positives: string[];
    negatives: string[];
  };
}

interface PrescriptionResult {
  prescribeAllowed: boolean;
  drug_name: string;
  dosage: string;
  notes: string;
  requireClinicianApproval?: boolean;
  isOTC?: boolean;
  message?: string;
}

const EnhancedWellnessChecker = () => {
  usePageSEO({
    title: 'Prescribly | Advanced Wellness Checker - AI Doctor with 1,200+ Conditions',
    description: 'Advanced AI health diagnosis using 1,200+ medical conditions database. Bayesian analysis with 85-95% accuracy. Get instant symptoms analysis and treatment recommendations.'
  });

  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // State management
  const [currentStep, setCurrentStep] = useState<FlowStep>('entry');
  const [consentGiven, setConsentGiven] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Form data
  const [symptoms, setSymptoms] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  
  // Results
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult[]>([]);
  const [prescription, setPrescription] = useState<PrescriptionResult | null>(null);
  
  // Session management
  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    const storedSessionId = localStorage.getItem('prescribly_session_id');
    
    if (storedSessionId) {
      try {
        const { data, error } = await supabase.functions.invoke('resume-session', {
          body: { session_id: storedSessionId }
        });

        if (data?.found && data.session) {
          setSessionId(storedSessionId);
          // Optionally restore state from session
          if (data.session.payload) {
            const payload = data.session.payload;
            if (payload.symptoms) setSymptoms(payload.symptoms);
            if (payload.age) setAge(payload.age);
            if (payload.gender) setGender(payload.gender);
            if (payload.currentStep) setCurrentStep(payload.currentStep);
          }
          return;
        }
      } catch (error) {
        console.error('Error resuming session:', error);
      }
    }

    // Create new session
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('save-session', {
        body: { 
          user_id: user?.id || null,
          path: 'entry',
          payload: { startedAt: Date.now() }
        }
      });

      if (data?.session_id) {
        setSessionId(data.session_id);
        localStorage.setItem('prescribly_session_id', data.session_id);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const saveSession = async (step: FlowStep, additionalData: any = {}) => {
    if (!sessionId) return;

    try {
      await supabase.functions.invoke('save-session', {
        body: {
          session_id: sessionId,
          path: step,
          payload: {
            symptoms,
            age,
            gender,
            selectedSymptoms,
            currentStep: step,
            ...additionalData
          }
        }
      });
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const handleEntryChoice = (choice: FlowStep) => {
    if (!consentGiven) {
      toast.error('Please accept the consent notice first.');
      return;
    }
    setCurrentStep(choice);
    saveSession(choice);
  };

  const handleFreeTextSubmit = async () => {
    if (!symptoms.trim()) {
      toast.error('Please describe your symptoms');
      return;
    }

    setLoading(true);
    try {
      // Parse symptoms with enhanced AI
      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-symptoms', {
        body: { text: symptoms, session_id: sessionId }
      });

      if (parseError) throw parseError;

      if (!parseData?.matched_conditions || parseData.matched_conditions.length === 0) {
        toast.error('No conditions found. Please try rephrasing your symptoms or use guided questions.');
        setCurrentStep('guided');
        return;
      }

      // Enhanced Bayesian diagnosis
      const { data: diagnosisData, error: diagnosisError } = await supabase.functions.invoke('diagnose', {
        body: { 
          matchedConditions: parseData.matched_conditions,
          age: age ? parseInt(age) : null,
          gender: gender || null,
          session_id: sessionId
        }
      });

      if (diagnosisError) throw diagnosisError;

      const results = diagnosisData?.results || [];
      setDiagnosis(results);

      // Get prescription for top condition
      if (results.length > 0) {
        const { data: prescriptionData } = await supabase.functions.invoke('prescribe', {
          body: { 
            condition_id: results[0].condition_id,
            user_profile: {
              age: age ? parseInt(age) : null,
              gender: gender || null,
              // Add more profile data as needed
            }
          }
        });
        setPrescription(prescriptionData);
      }

      setCurrentStep('results');
      saveSession('results', { results, prescription });
      
    } catch (error) {
      console.error('Diagnosis error:', error);
      toast.error('Failed to analyze symptoms. Please try again or use guided questions.');
    }
    setLoading(false);
  };

  const handleConsultDoctor = () => {
    navigate('/book-appointment', { 
      state: { 
        symptoms,
        diagnosis: diagnosis[0],
        prescription,
        sessionId
      } 
    });
  };

  const handleSaveResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to save results');
        return;
      }

      await supabase.functions.invoke('log-wellness-history', {
        body: {
          user_id: user.id,
          session_id: sessionId,
          input_text: symptoms,
          parsed: diagnosis,
          results: diagnosis,
          prescription: prescription,
          model_versions: { version: 'enhanced-v1', timestamp: Date.now() }
        }
      });

      toast.success('Results saved to your health history');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save results');
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'free-text':
      case 'symptom-picker':
      case 'guided':
        setCurrentStep('entry');
        break;
      case 'results':
        setCurrentStep('entry');
        setDiagnosis([]);
        setPrescription(null);
        setSymptoms('');
        break;
      default:
        navigate('/dashboard');
    }
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>
      <LanguageSelector />
    </div>
  );

  const renderFreeText = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" />
          Describe Your Symptoms
        </h2>
        <p className="text-muted-foreground">Tell us how you're feeling in your own words</p>
      </div>

      <Card className="border-primary/20">
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Symptom Description</label>
            <Textarea
              placeholder="Example: I have a severe headache that started this morning, feeling dizzy and nauseous. The pain is behind my eyes and gets worse with light..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={4}
              className="min-h-[120px]"
            />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Age (optional)</label>
              <Input
                type="number"
                placeholder="25"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="1"
                max="120"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Gender (optional)</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <Button 
            onClick={handleFreeTextSubmit}
            disabled={loading || !symptoms.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <motion.div className="flex items-center gap-2">
                <Brain className="w-4 h-4 animate-pulse" />
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Analyzing with AI...
              </motion.div>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Analyze Symptoms
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderResults = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          AI Analysis Results
        </h2>
        <p className="text-muted-foreground">Based on advanced Bayesian analysis of your symptoms</p>
      </div>

      {diagnosis.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Most Likely Condition
              {diagnosis[0].is_rare && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  Rare Condition
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">{diagnosis[0].name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Progress value={diagnosis[0].probability} className="flex-1" />
                <Badge variant="secondary">{diagnosis[0].probability}% match</Badge>
              </div>
            </div>
            
            <p className="text-muted-foreground">{diagnosis[0].description}</p>

            {diagnosis[0].explain?.positives?.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm font-medium text-blue-900 mb-1">Key Evidence:</p>
                <div className="flex flex-wrap gap-1">
                  {diagnosis[0].explain.positives.map((evidence, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {evidence}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {prescription && (
              <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-blue-600" />
                    {prescription.requireClinicianApproval ? 'Requires Prescription' : 'Treatment Recommendation'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">{prescription.drug_name}</p>
                    <p className="text-sm text-muted-foreground">{prescription.dosage}</p>
                  </div>
                  
                  {prescription.requireClinicianApproval && (
                    <div className="bg-orange-50 border border-orange-200 p-3 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-orange-800">
                          This medication requires a prescription from a licensed healthcare provider.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {prescription.isOTC && (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-md">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-green-800">
                          This is an over-the-counter medication. Please follow package instructions.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-yellow-800">{prescription.notes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {diagnosis.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Other Possibilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {diagnosis.slice(1, 4).map((result, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span>{result.name}</span>
                  {result.is_rare && (
                    <Badge variant="outline" className="text-xs text-orange-600">Rare</Badge>
                  )}
                </div>
                <Badge variant="outline">{result.probability}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Button onClick={handleConsultDoctor} size="lg" className="w-full">
          <User className="w-4 h-4 mr-2" />
          Consult a Doctor Now
        </Button>
        <Button onClick={handleSaveResults} variant="outline" size="lg" className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Save to History
        </Button>
      </div>

      <div className="bg-red-50 border border-red-200 p-4 rounded-md">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-medium">Important Medical Disclaimer</p>
            <p>This AI analysis is for informational purposes only and does not constitute medical diagnosis or treatment advice. Always consult with licensed healthcare providers for proper medical care, especially for prescription medications.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderContent = () => {
    switch (currentStep) {
      case 'free-text':
        return renderFreeText();
      case 'results':
        return renderResults();
      default:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-full mb-4 shadow-lg"
              >
                <Heart className="h-10 w-10 text-white" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Prescribly Enhanced
                </h1>
                <p className="text-xl text-primary font-medium mt-1">
                  Advanced AI Wellness Checker
                </p>
              </div>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Powered by 1,200+ medical conditions database with advanced Bayesian analysis. 
                Get accurate diagnosis and treatment recommendations with 85-95% clinical accuracy.
              </p>
            </div>

            {/* Consent Notice */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-primary">
                      Enhanced AI Analysis & Medical Consent
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      This advanced wellness checker uses Bayesian inference and a comprehensive database 
                      of 1,200+ medical conditions to provide detailed health analysis and treatment recommendations. 
                      This system is for informational purposes only and does not replace professional medical diagnosis. 
                      Always consult licensed healthcare providers before taking any medication or treatment decisions.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="consent"
                        checked={consentGiven}
                        onChange={(e) => setConsentGiven(e.target.checked)}
                        className="rounded border-primary"
                      />
                      <label htmlFor="consent" className="text-sm cursor-pointer">
                        I understand this is an AI analysis tool and agree to proceed
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Entry Options */}
            <div className="grid gap-6 md:grid-cols-3">
              <motion.div whileHover={{ scale: 1.02 }}>
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg h-full ${
                    !consentGiven ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => handleEntryChoice('free-text')}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      Free Description
                    </CardTitle>
                    <Badge variant="default" className="w-fit">Enhanced AI</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Describe symptoms naturally. Advanced NLP parsing with direct database matching 
                      and Bayesian probability analysis for accurate diagnosis.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }}>
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg h-full opacity-50`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Smart Symptom Picker
                    </CardTitle>
                    <Badge variant="outline" className="w-fit">Coming Soon</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Interactive symptom selection from 1,200+ conditions database with instant 
                      fuzzy matching and real-time diagnosis probability updates.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }}>
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg h-full opacity-50`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Compass className="h-5 w-5 text-primary" />
                      Clinical Assessment
                    </CardTitle>
                    <Badge variant="outline" className="w-fit">Coming Soon</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Structured clinical workflow with age, gender, symptom severity, 
                      duration analysis and differential diagnosis generation.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Features Grid */}
            <div className="grid gap-4 md:grid-cols-4 mt-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
                  <Brain className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold">Bayesian AI</h3>
                <p className="text-sm text-muted-foreground">Advanced probability analysis</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold">85-95% Accuracy</h3>
                <p className="text-sm text-muted-foreground">Clinical-grade precision</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-2">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold">Instant Results</h3>
                <p className="text-sm text-muted-foreground">Real-time analysis</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-2">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="font-semibold">1,200+ Conditions</h3>
                <p className="text-sm text-muted-foreground">Comprehensive database</p>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        {renderHeader()}
        {renderContent()}
      </div>
      
      {/* Footer disclaimer */}
      <div className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <p className="text-xs text-muted-foreground text-center">
            <strong>Clinician sign-off required.</strong> No prescription medications should be issued without 
            licensed clinician review and approval. All diagnostic actions are logged with session and model version details. 
            This AI system provides analysis for informational purposes only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnhancedWellnessChecker;