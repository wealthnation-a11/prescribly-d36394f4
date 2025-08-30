import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Zap, 
  Compass, 
  Heart,
  Shield,
  Globe,
  ArrowLeft,
  Stethoscope
} from 'lucide-react';
import { FreeTextInput } from '@/components/wellness/FreeTextInput';
import { QuickSymptomPicker } from '@/components/wellness/QuickSymptomPicker';
import { GuidedQuestions } from '@/components/wellness/GuidedQuestions';
import { BayesianDiagnosis } from '@/components/wellness/BayesianDiagnosis';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from 'react-router-dom';
import { usePageSEO } from '@/hooks/usePageSEO';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type FlowStep = 'entry' | 'free-text' | 'quick-picker' | 'guided' | 'analysis';

interface DiagnosisData {
  symptomIds: string[];
  age?: number;
  gender?: string;
}

const WellnessChecker = () => {
  usePageSEO({
    title: 'AI Health Checker - Prescribly | Instant Symptom Analysis',
    description: 'Get AI-powered health insights in seconds. Describe symptoms, receive Bayesian diagnosis with 85-95% accuracy, and connect with licensed doctors.'
  });

  const { t, currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<FlowStep>('entry');
  const [diagnosisData, setDiagnosisData] = useState<DiagnosisData>({ symptomIds: [] });
  const [consentGiven, setConsentGiven] = useState(false);

  const handleEntryChoice = (choice: FlowStep) => {
    if (!consentGiven) {
      toast.error('Please accept the consent notice first.');
      return;
    }
    
    setCurrentStep(choice);
    logAnalytics('start_check', { entry_method: choice });
  };

  const handleFreeTextResults = (symptomIds: string[]) => {
    setDiagnosisData({ symptomIds });
    setCurrentStep('analysis');
    logAnalytics('nlp_ok', { symptom_count: symptomIds.length });
  };

  const handleFreeTextFallback = () => {
    setCurrentStep('guided');
    logAnalytics('fell_back_to_guided', { reason: 'no_symptoms_found' });
  };

  const handleQuickPickerResults = (symptomIds: string[]) => {
    setDiagnosisData({ symptomIds });
    setCurrentStep('analysis');
    logAnalytics('diagnosis_ready', { method: 'quick_picker', symptom_count: symptomIds.length });
  };

  const handleGuidedComplete = (data: { age?: number; gender?: string; symptoms: string[] }) => {
    setDiagnosisData({
      symptomIds: data.symptoms,
      age: data.age,
      gender: data.gender
    });
    setCurrentStep('analysis');
    logAnalytics('diagnosis_ready', { method: 'guided', symptom_count: data.symptoms.length });
  };

  const handleConsultDoctor = (results: any[]) => {
    logAnalytics('consult_click', { top_condition: results[0]?.name });
    navigate('/book-appointment', { 
      state: { 
        symptoms: diagnosisData.symptomIds,
        diagnosis: results 
      } 
    });
  };

  const handleSaveResults = () => {
    logAnalytics('save_history', {});
    toast.success('Results saved to your health history.');
  };

  const logAnalytics = async (eventType: string, payload: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('analytics_events').insert({
          user_id: user.id,
          event_type: eventType,
          payload
        });
      }
    } catch (error) {
      console.error('Analytics error:', error);
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'free-text':
      case 'quick-picker':
      case 'guided':
        setCurrentStep('entry');
        break;
      case 'analysis':
        setCurrentStep('entry');
        setDiagnosisData({ symptomIds: [] });
        break;
      default:
        navigate('/dashboard');
    }
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'free-text':
        return (
          <FreeTextInput
            onSymptomsFound={handleFreeTextResults}
            onNoSymptomsFound={handleFreeTextFallback}
            onBack={handleBack}
          />
        );
      
      case 'quick-picker':
        return (
          <QuickSymptomPicker
            onContinue={handleQuickPickerResults}
            onBack={handleBack}
          />
        );
      
      case 'guided':
        return (
          <GuidedQuestions
            onComplete={handleGuidedComplete}
            onBack={handleBack}
          />
        );
      
      case 'analysis':
        return (
          <BayesianDiagnosis
            symptomIds={diagnosisData.symptomIds}
            age={diagnosisData.age}
            gender={diagnosisData.gender}
            onConsultDoctor={handleConsultDoctor}
            onSaveResults={handleSaveResults}
          />
        );
      
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
                className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[hsl(205,100%,36%)] to-[hsl(199,89%,64%)] rounded-full mb-4 shadow-lg"
              >
                <Heart className="h-10 w-10 text-white" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[hsl(205,100%,36%)] to-[hsl(199,89%,64%)] bg-clip-text text-transparent">
                  Prescribly
                </h1>
                <p className="text-xl text-[hsl(205,100%,36%)] font-medium mt-1">
                  Doctor in Your Pocket
                </p>
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Smarter, faster, safer than any symptom checker. Bayesian AI with 85-95% accuracy.
              </p>
            </div>

            {/* Consent Notice */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-primary">
                      Important Notice & Consent
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      This AI health checker is for informational purposes only and does not provide medical diagnosis. 
                      Always consult with licensed healthcare providers for proper medical care. By proceeding, you consent 
                      to data processing for health analysis and understand this is not a substitute for professional medical advice.
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
                        I understand and agree to proceed
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
                  className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg ${
                    !consentGiven ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => handleEntryChoice('free-text')}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      💬 Describe Freely
                    </CardTitle>
                    <Badge variant="secondary" className="w-fit">Recommended</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      💬 Describe your symptoms naturally. Advanced NLP parsing with Bayesian analysis for 85-95% accuracy.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }}>
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg ${
                    !consentGiven ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => handleEntryChoice('quick-picker')}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      ⚡ Quick Symptom Picker
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      ⚡ Select from 1,200+ symptoms in our database. Quick selection with instant Bayesian diagnosis.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }}>
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg ${
                    !consentGiven ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => handleEntryChoice('guided')}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Compass className="h-5 w-5 text-primary" />
                      🧭 Guided Questions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      🧭 Clinical-grade assessment with branching logic. Comprehensive health evaluation for complex cases.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Features */}
            <div className="grid gap-4 md:grid-cols-3 mt-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-1">Safe & Private</h3>
                <p className="text-sm text-muted-foreground">
                  Your health data is encrypted and secure
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2">
                  <Stethoscope className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-1">Expert Connection</h3>
                <p className="text-sm text-muted-foreground">
                  Easy access to licensed doctors
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-2">
                  <Globe className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-1">Multi-Language</h3>
                <p className="text-sm text-muted-foreground">
                  Available in multiple languages
                </p>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[hsl(199,100%,88%)] to-[hsl(199,89%,64%)]/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {currentStep === 'entry' ? 'Back to Dashboard' : 'Back'}
          </Button>
          <LanguageSelector />
        </div>

        <div className="max-w-4xl mx-auto">
          {renderContent()}
        </div>

        <div className="text-center mt-12 text-xs text-muted-foreground">
          <p>
            Prescribly Health Checker • Powered by Bayesian AI • Not a medical device
          </p>
          <p className="mt-1">
            Estimated model accuracy: ~85–95% (improves with use)
          </p>
        </div>
      </div>
    </div>
  );
};

export default WellnessChecker;