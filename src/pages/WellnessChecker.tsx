import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageSEO } from '@/hooks/usePageSEO';
import EnhancedWellnessChecker from './EnhancedWellnessChecker';

const WellnessChecker = () => {
  const navigate = useNavigate();
  
  usePageSEO({
    title: 'Prescribly | Enhanced Wellness Checker - AI Doctor with 1,200+ Conditions',
    description: 'Advanced AI health diagnosis using 1,200+ medical conditions database. Bayesian analysis with 85-95% accuracy. Get instant symptoms analysis and treatment recommendations.'
  });

  // Redirect to enhanced version
  React.useEffect(() => {
    navigate('/enhanced-wellness-checker', { replace: true });
  }, [navigate]);

  return <EnhancedWellnessChecker />;
};

export default WellnessChecker;

  const handleEntryChoice = (choice: FlowStep) => {
    if (!consentGiven) {
      toast.error('Please accept the consent notice first.');
      return;
    }
    setCurrentStep(choice);
  };

  const handleFreeTextSubmit = async () => {
    if (!symptoms.trim()) {
      toast.error('Please describe your symptoms');
      return;
    }

    setLoading(true);
    try {
      // Parse symptoms
      const { data: parsedData, error: parseError } = await supabase.functions.invoke('parse-symptoms', {
        body: { text: symptoms }
      });

      if (parseError) throw parseError;

      if (!parsedData?.matched_conditions || parsedData.matched_conditions.length === 0) {
        toast.error('No conditions found. Please try rephrasing your symptoms.');
        setLoading(false);
        return;
      }

      // Diagnose
      const { data: diagnosisData, error: diagnosisError } = await supabase.functions.invoke('diagnose', {
        body: { 
          matchedConditions: parsedData.matched_conditions,
          age: age ? parseInt(age) : null,
          gender: gender || null
        }
      });

      if (diagnosisError) throw diagnosisError;

      setDiagnosis(diagnosisData || []);

      // Get prescription for top condition
      if (diagnosisData && diagnosisData.length > 0) {
        const { data: prescriptionData } = await supabase.functions.invoke('prescribe', {
          body: { condition_id: diagnosisData[0].condition_id }
        });
        setPrescription(prescriptionData);
      }

      setCurrentStep('results');
    } catch (error) {
      console.error('Diagnosis error:', error);
      toast.error('Failed to analyze symptoms. Please try again.');
    }
    setLoading(false);
  };

  const handleConsultDoctor = () => {
    navigate('/book-appointment', { 
      state: { 
        symptoms,
        diagnosis: diagnosis[0],
        prescription
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
          input_text: symptoms,
          matched_conditions: diagnosis,
          top_condition: diagnosis[0],
          drug_recommendation: prescription
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
      case 'quick-picker':
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

  const renderFreeText = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">💬 Describe Your Symptoms</h2>
        <p className="text-muted-foreground">Tell us how you're feeling in your own words</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <Textarea
            placeholder="Example: I have a severe headache, feeling dizzy, and nauseous..."
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            rows={4}
            className="min-h-[120px]"
          />
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Age (optional)</label>
              <input
                type="number"
                placeholder="25"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Gender (optional)</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
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
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Analyzing...
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
        <h2 className="text-2xl font-bold">🎯 Analysis Results</h2>
        <p className="text-muted-foreground">Based on your symptoms</p>
      </div>

      {diagnosis.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Most Likely Condition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">{diagnosis[0].name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Progress value={diagnosis[0].probability} className="flex-1" />
                <Badge variant="secondary">{diagnosis[0].probability.toFixed(1)}% match</Badge>
              </div>
            </div>
            
            <p className="text-muted-foreground">{diagnosis[0].description}</p>

            {prescription && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-blue-600" />
                    Recommended Treatment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">{prescription.drug_name}</p>
                    <p className="text-sm text-muted-foreground">{prescription.dosage}</p>
                  </div>
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
            <CardTitle>Other Possibilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {diagnosis.slice(1, 3).map((result, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                <span>{result.name}</span>
                <Badge variant="outline">{result.probability.toFixed(1)}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Button onClick={handleConsultDoctor} size="lg" className="w-full">
          <User className="w-4 h-4 mr-2" />
          👩‍⚕️ Consult a Doctor Now
        </Button>
        <Button onClick={handleSaveResults} variant="outline" size="lg" className="w-full">
          <Save className="w-4 h-4 mr-2" />
          💾 Save to History
        </Button>
      </div>

      <div className="bg-red-50 border border-red-200 p-4 rounded-md">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-medium">Important Disclaimer</p>
            <p>This AI analysis is for informational purposes only and does not constitute medical diagnosis. Always consult with licensed healthcare providers for proper medical care.</p>
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
                  Prescribly
                </h1>
                <p className="text-xl text-primary font-medium mt-1">
                  Your Personal AI Doctor
                </p>
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Advanced AI diagnosis with prescription recommendations. 1,200+ conditions database with 85-95% accuracy.
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
                      This AI health checker provides informational analysis and drug suggestions based on symptoms. 
                      It does not replace professional medical diagnosis. Always consult licensed healthcare providers 
                      before taking any medication. By proceeding, you consent to health data processing.
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
                      💬 Free Description
                    </CardTitle>
                    <Badge variant="secondary" className="w-fit">Recommended</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Describe symptoms naturally. Advanced parsing with direct database matching for accurate diagnosis and prescription.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }}>
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg ${
                    !consentGiven ? 'opacity-50 cursor-not-allowed' : 'opacity-50'
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      ⚡ Symptom Picker
                    </CardTitle>
                    <Badge variant="outline" className="w-fit">Coming Soon</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Quick selection from 1,200+ symptoms with instant diagnosis and drug recommendations.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }}>
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg ${
                    !consentGiven ? 'opacity-50 cursor-not-allowed' : 'opacity-50'
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Compass className="h-5 w-5 text-primary" />
                      🧭 Guided Questions
                    </CardTitle>
                    <Badge variant="outline" className="w-fit">Coming Soon</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Clinical assessment with age, gender, and symptom severity analysis for comprehensive diagnosis.
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
                  Secure health data processing
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2">
                  <Stethoscope className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-1">Direct Prescriptions</h3>
                <p className="text-sm text-muted-foreground">
                  Drug recommendations with dosage
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-2">
                  <Globe className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-1">1,200+ Conditions</h3>
                <p className="text-sm text-muted-foreground">
                  Comprehensive medical database
                </p>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10">
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
            Prescribly Wellness Checker • Powered by Supabase Database • 1,200+ Conditions
          </p>
          <p className="mt-1">
            Estimated accuracy: ~85–95% • Not a medical device • Always consult doctors
          </p>
        </div>
      </div>
    </div>
  );
};

export default WellnessChecker;