import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Brain, Clock, AlertTriangle, BookOpenCheck, CalendarPlus, Save, AlertCircle, Shield } from "lucide-react";
import { SecurityCompliantForm } from "@/components/SecurityCompliantForm";
import { usePageSEO } from "@/hooks/usePageSEO";

interface Diagnosis {
  condition_id: string;
  condition_name: string;
  probability: number;
  explanation: string;
  severity: string;
  confidence: string;
}

interface DiagnosisResults {
  success: boolean;
  emergency: boolean;
  alert_message?: string;
  diagnoses: Diagnosis[];
  session_id: string;
}

interface DrugRecommendation {
  drug_name: string;
  rxnorm_id?: string;
  form: string;
  strength: string;
  dosage: string;
  warnings: string[];
  category: string;
  first_line: boolean;
  notes?: string;
}

interface SymptomOption {
  id: string;
  name: string;
  category: string;
}

const commonSymptoms: SymptomOption[] = [
  { id: "1", name: "Fever", category: "General" },
  { id: "2", name: "Headache", category: "Neurological" },
  { id: "3", name: "Cough", category: "Respiratory" },
  { id: "4", name: "Sore throat", category: "Respiratory" },
  { id: "5", name: "Nausea", category: "Gastrointestinal" },
  { id: "6", name: "Fatigue", category: "General" },
  { id: "7", name: "Dizziness", category: "Neurological" },
  { id: "8", name: "Joint pain", category: "Musculoskeletal" },
];

export const SystemAssessment = () => {
  usePageSEO({
    title: "AI Health Assessment - Get Instant Symptom Analysis | PrescriblyAI",
    description: "Get instant AI-powered health assessments with our advanced diagnostic system. Analyze symptoms, get preliminary diagnoses, and connect with qualified doctors for professional care."
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSecureForm, setShowSecureForm] = useState(false);
  
  // Form state
  const [freeTextSymptoms, setFreeTextSymptoms] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [results, setResults] = useState<DiagnosisResults | null>(null);
  const [drugRecommendations, setDrugRecommendations] = useState<DrugRecommendation[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSymptomToggle = (symptomId: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptomId)
        ? prev.filter(id => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const handleDiagnosis = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Get symptom names for the API call
      const symptomNames = selectedSymptoms.map(id => 
        commonSymptoms.find(s => s.id === id)?.name
      ).filter(Boolean) as string[];

      // Combine symptoms
      let allSymptoms = freeTextSymptoms.trim();
      if (symptomNames.length > 0) {
        allSymptoms = allSymptoms ? `${allSymptoms}, ${symptomNames.join(', ')}` : symptomNames.join(', ');
      }

      // Call enhanced diagnosis API
      const { data, error } = await supabase.functions.invoke('diagnose-symptoms', {
        body: { 
          symptoms: allSymptoms,
          demographicInfo: {
            age: 30, // You could collect this from user profile
            gender: "unknown" // You could collect this from user profile
          }
        }
      });

      if (error) throw error;

      setResults(data);
      
      // Fetch drug recommendations for top diagnosis if not emergency
      if (!data.emergency && data.diagnoses && data.diagnoses.length > 0) {
        fetchDrugRecommendations(data.diagnoses[0].condition_id);
      }

      // Create audit log for diagnosis generation
      try {
        await supabase.functions.invoke('create-audit-log', {
          body: {
            diagnosis_id: data.session_id || 'temp_' + Date.now(),
            actor_id: user.id,
            action: 'diagnosis_generated',
            details: {
              symptom_count: selectedSymptoms.length + (freeTextSymptoms.trim() ? 1 : 0),
              diagnosis_count: data.diagnoses?.length || 0,
              emergency_detected: data.emergency || false,
              ai_model: 'bayesian_inference'
            }
          }
        });
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
      }

      setStep(3);
      
    } catch (error) {
      console.error('Diagnosis error:', error);
      toast({
        title: "Error",
        description: "Failed to get diagnosis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDrugRecommendations = async (conditionId: string) => {
    try {
      // Use the drug-recommendations function with the condition ID in the URL path
      const response = await fetch(`https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/drug-recommendations/${conditionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const drugData = await response.json();
        if (drugData.success && drugData.recommendations) {
          setDrugRecommendations(drugData.recommendations);
        }
      }
    } catch (error) {
      console.error('Error fetching drug recommendations:', error);
    }
  };

  const handleSaveReport = async () => {
    if (!user || !results) return;

    setSaving(true);
    try {
      // Save to diagnosis sessions using the v2 table
      const { data, error } = await supabase
        .from('diagnosis_sessions_v2')
        .insert({
          user_id: user.id,
          symptoms: selectedSymptoms.concat(freeTextSymptoms ? [freeTextSymptoms] : []) as any,
          conditions: results.diagnoses as any,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      try {
        await supabase.functions.invoke('create-audit-log', {
          body: {
            diagnosis_id: data.id,
            actor_id: user.id,
            action: 'report_saved',
            details: {
              symptom_count: selectedSymptoms.length + (freeTextSymptoms.trim() ? 1 : 0),
              diagnosis_count: results.diagnoses.length,
              has_emergency_alert: results.emergency || false
            }
          }
        });
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
      }

      toast({
        title: "Report Saved",
        description: "Your diagnosis report has been saved successfully.",
      });

      // Update the session ID for potential booking
      setSessionId(data.id);
      
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: "Error",
        description: "Failed to save report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBookDoctor = () => {
    // Navigate to booking with diagnosis data
    const diagnosisSession = {
      id: sessionId,
      symptoms: selectedSymptoms.concat(freeTextSymptoms ? [freeTextSymptoms] : []),
      conditions: results?.diagnoses || [],
      suggested_drugs: drugRecommendations
    };
    
    navigate('/book-appointment', { 
      state: { diagnosisSession } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
            <Brain className="w-8 h-8 text-blue-600" />
            AI Health Assessment System
          </h1>
          <p className="text-slate-600">Enterprise-grade security meets advanced AI diagnostics</p>
        </div>

        {/* Security Mode Toggle */}
        <div className="flex justify-center gap-4 mb-8">
          <Button 
            onClick={() => setShowSecureForm(false)}
            variant={!showSecureForm ? "default" : "outline"}
          >
            Basic Assessment
          </Button>
          <Button 
            onClick={() => setShowSecureForm(true)}
            variant={showSecureForm ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            Secure Assessment (Recommended)
          </Button>
        </div>

        {showSecureForm ? (
          <SecurityCompliantForm />
        ) : (
          <>
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
                <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
                <div className={`w-16 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</div>
              </div>
            </div>

        {/* Step 1: Symptom Selection */}
        {step === 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Tell us about your symptoms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Free text input */}
              <div>
                <label className="block text-sm font-medium mb-2">Describe your symptoms</label>
                <Textarea
                  placeholder="Please describe what you're experiencing in detail..."
                  value={freeTextSymptoms}
                  onChange={(e) => setFreeTextSymptoms(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Common symptoms selection */}
              <div>
                <label className="block text-sm font-medium mb-3">Select any symptoms you're experiencing</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {commonSymptoms.map((symptom) => (
                    <div key={symptom.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={symptom.id}
                        checked={selectedSymptoms.includes(symptom.id)}
                        onCheckedChange={() => handleSymptomToggle(symptom.id)}
                      />
                      <label
                        htmlFor={symptom.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {symptom.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => setStep(2)} 
                className="w-full"
                disabled={!freeTextSymptoms.trim() && selectedSymptoms.length === 0}
              >
                Continue to Assessment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review & Process */}
        {step === 2 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Review your symptoms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {freeTextSymptoms && (
                <div>
                  <h4 className="font-medium mb-2">Description:</h4>
                  <p className="text-slate-600 bg-gray-50 p-3 rounded">{freeTextSymptoms}</p>
                </div>
              )}

              {selectedSymptoms.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Selected symptoms:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSymptoms.map(id => {
                      const symptom = commonSymptoms.find(s => s.id === id);
                      return symptom ? (
                        <Badge key={id} variant="secondary">{symptom.name}</Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back to Edit
                </Button>
                <Button 
                  onClick={handleDiagnosis} 
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                      Processing...
                    </div>
                  ) : (
                    <>Get AI Assessment</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Results */}
        {step === 3 && results && (
          <div className="space-y-6">
            {/* Emergency Alert */}
            {results.emergency && results.alert_message && (
              <Card className="border-red-500 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-red-800 mb-2">Emergency Alert</h3>
                      <p className="text-red-700">{results.alert_message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Diagnoses */}
            {!results.emergency && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI Assessment Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {results.diagnoses && results.diagnoses.length > 0 ? (
                    <div className="space-y-4">
                      {results.diagnoses.map((diagnosis, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{diagnosis.condition_name}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {(diagnosis.probability * 100).toFixed(1)}% match
                              </Badge>
                              <Badge variant={diagnosis.severity === 'high' ? 'destructive' : diagnosis.severity === 'moderate' ? 'default' : 'secondary'}>
                                {diagnosis.severity}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{diagnosis.explanation}</p>
                          <div className="text-xs text-slate-500">
                            Confidence: {diagnosis.confidence}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No diagnoses available.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Drug Recommendations */}
            {!results.emergency && drugRecommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Suggested Medications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {drugRecommendations.map((drug, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{drug.drug_name}</h4>
                          <div className="flex items-center gap-2">
                            {drug.first_line && (
                              <Badge variant="default">First Line</Badge>
                            )}
                            <Badge variant="secondary">{drug.category}</Badge>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p><span className="font-medium">Form:</span> {drug.form}</p>
                          <p><span className="font-medium">Strength:</span> {drug.strength}</p>
                          <p><span className="font-medium">Dosage:</span> {drug.dosage}</p>
                          {drug.warnings && drug.warnings.length > 0 && (
                            <div>
                              <span className="font-medium">Warnings:</span>
                              <ul className="list-disc list-inside mt-1 text-xs text-slate-600">
                                {drug.warnings.map((warning, i) => (
                                  <li key={i}>{warning}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {drug.notes && (
                            <p className="text-slate-500 text-xs">{drug.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Disclaimer */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">For doctor review only</p>
                        <p className="text-sm text-yellow-700">
                          These suggestions require professional medical review before use.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            {!results.emergency && (
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleBookDoctor}
                  className="flex-1"
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Book Doctor Consultation
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleSaveReport}
                  disabled={saving || !!sessionId}
                >
                  {sessionId ? (
                    <>
                      <BookOpenCheck className="w-4 h-4 mr-2" />
                      Report Saved
                    </>
                  ) : saving ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Report
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Navigation */}
            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setStep(1);
                  setResults(null);
                  setDrugRecommendations([]);
                  setSelectedSymptoms([]);
                  setFreeTextSymptoms("");
                  setSessionId(null);
                }}
              >
                Start New Assessment
              </Button>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};