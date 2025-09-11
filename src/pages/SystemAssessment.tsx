import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Brain, Clock, AlertTriangle, BookOpenCheck, CalendarPlus, Save } from "lucide-react";

interface Diagnosis {
  condition_id: number;
  name: string;
  description: string;
  probability: number;
}

interface DrugRecommendation {
  drug_name: string;
  dosage: string;
  notes: string;
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [freeTextSymptoms, setFreeTextSymptoms] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [drugRecommendations, setDrugRecommendations] = useState<DrugRecommendation[]>([]);
  const [sessionId, setSessionId] = useState<string>("");

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

      // Add free text symptoms
      if (freeTextSymptoms.trim()) {
        symptomNames.push(...freeTextSymptoms.split(',').map(s => s.trim()));
      }

      // Call diagnosis API
      const { data: diagnosisData, error } = await supabase.functions.invoke('diagnose-with-bayesian', {
        body: { 
          symptom_names: symptomNames,
          age: 30, // You could collect this from user profile
          gender: "unknown" // You could collect this from user profile
        }
      });

      if (error) throw error;

      const diagnosesList = diagnosisData || [];
      setDiagnoses(diagnosesList);

      // Get drug recommendations for top diagnosis
      if (diagnosesList.length > 0) {
        const topConditionId = diagnosesList[0].condition_id;
        
        const { data: drugData, error: drugError } = await supabase.functions.invoke('recommend-drug', {
          body: { condition_id: topConditionId }
        });

        if (drugError) {
          console.error('Drug recommendation error:', drugError);
        } else if (drugData) {
          setDrugRecommendations([drugData]);
        }
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

  const handleSaveReport = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('diagnosis_sessions')
        .insert([{
          patient_id: user.id,
          symptoms_text: freeTextSymptoms,
          selected_symptoms: selectedSymptoms as any,
          ai_diagnoses: diagnoses as any,
          suggested_drugs: drugRecommendations as any,
        }])
        .select()
        .single();

      if (error) throw error;

      setSessionId(data.id);
      toast({
        title: "Report Saved",
        description: "Your assessment has been saved successfully.",
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to save report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookDoctor = () => {
    // Navigate to booking with diagnosis data
    const diagnosisData = {
      diagnoses,
      symptoms: freeTextSymptoms,
      selectedSymptoms,
      drugRecommendations
    };
    
    // Store in localStorage to pass to booking page
    localStorage.setItem('diagnosisData', JSON.stringify(diagnosisData));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center justify-center gap-2">
            <Brain className="w-8 h-8 text-blue-600" />
            System Assessment
          </h1>
          <p className="text-slate-600">AI-powered health assessment and recommendations</p>
        </div>

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
        {step === 3 && (
          <div className="space-y-6">
            {/* AI Diagnoses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Assessment Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diagnoses.length > 0 ? (
                  <div className="space-y-4">
                    {diagnoses.map((diagnosis, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{diagnosis.name}</h4>
                          <Badge variant="outline">
                            {(diagnosis.probability * 100).toFixed(1)}% match
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{diagnosis.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">No diagnoses available.</p>
                )}
              </CardContent>
            </Card>

            {/* Drug Recommendations */}
            {drugRecommendations.length > 0 && (
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
                        <h4 className="font-medium">{drug.drug_name}</h4>
                        <p className="text-sm text-slate-600 mb-1">Dosage: {drug.dosage}</p>
                        {drug.notes && (
                          <p className="text-sm text-slate-500">{drug.notes}</p>
                        )}
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
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                asChild 
                className="flex-1"
                onClick={handleBookDoctor}
              >
                <Link to="/book-appointment">
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Book a Doctor
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleSaveReport}
                disabled={loading || !!sessionId}
              >
                {sessionId ? (
                  <>
                    <BookOpenCheck className="w-4 h-4 mr-2" />
                    Report Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Report
                  </>
                )}
              </Button>
            </div>

            {/* Navigation */}
            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setStep(1);
                  setDiagnoses([]);
                  setDrugRecommendations([]);
                  setSelectedSymptoms([]);
                  setFreeTextSymptoms("");
                }}
              >
                Start New Assessment
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};