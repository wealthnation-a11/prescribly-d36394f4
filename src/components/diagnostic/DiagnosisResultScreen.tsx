import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Pill, 
  FileText, 
  History, 
  RotateCcw,
  TrendingUp,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DiagnosisResultScreenProps {
  symptoms: string[];
  answers: Record<string, string>;
  onComplete: (result: any) => void;
  onViewHistory: () => void;
  onStartNew: () => void;
}

export const DiagnosisResultScreen: React.FC<DiagnosisResultScreenProps> = ({
  symptoms,
  answers,
  onComplete,
  onViewHistory,
  onStartNew
}) => {
  const { user } = useAuth();
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drugRecommendations, setDrugRecommendations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get diagnosis from backend
  useEffect(() => {
    const getDiagnosis = async () => {
      setLoading(true);
      try {
        // Prepare payload for diagnosis
        const payload = {
          symptoms: symptoms,
          answers: answers,
          user_id: user?.id,
          session_id: crypto.randomUUID()
        };

        console.log('Calling diagnose-symptoms with payload:', payload);
        
        // Call the diagnose edge function
        const { data, error } = await supabase.functions.invoke('diagnose-symptoms', {
          body: payload
        });

        if (error) {
          console.error('Supabase function error:', error);
          throw error;
        }
        
        console.log('Diagnosis result received:', data);
        setDiagnosisResult(data);
        
        // Get drug recommendations for top diagnosis
        if (data.diagnoses && data.diagnoses.length > 0) {
          const topConditionId = data.diagnoses[0].condition_id;
          await loadDrugRecommendations(topConditionId);
        }

        onComplete(data);
      } catch (error) {
        console.error('Error getting diagnosis:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(`Failed to get diagnosis: ${errorMessage}`);
        toast.error('Failed to get diagnosis. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    getDiagnosis();
  }, [symptoms, answers, user, onComplete]);

  const loadDrugRecommendations = async (conditionId: number) => {
    try {
      console.log('Loading drug recommendations for condition ID:', conditionId);
      
      // Fetch drug recommendations from the drugs table
      const { data: drugsData, error: drugsError } = await supabase
        .from('drugs')
        .select('id, drug_name, rxnorm_id, strength, form, dosage, notes')
        .eq('condition_id', conditionId)
        .limit(5);

      console.log('Drugs query result:', { drugsData, drugsError });

      if (drugsError) {
        console.error('Error fetching drugs:', drugsError);
        // Fallback to mock data if database query fails
        const fallbackDrugs = [
          {
            id: 1,
            drug_name: 'Acetaminophen',
            rxnorm_id: '161',
            strength: '500mg',
            form: 'Tablet',
            dosage: '1-2 tablets every 4-6 hours as needed',
            notes: 'For pain and fever relief. Do not exceed 4000mg in 24 hours.'
          }
        ];
        setDrugRecommendations(fallbackDrugs);
        return;
      }

      if (drugsData && drugsData.length > 0) {
        setDrugRecommendations(drugsData);
      } else {
        // No drugs found for this condition, use general recommendations
        const generalDrugs = [
          {
            id: 1,
            drug_name: 'General Pain Relief',
            rxnorm_id: '161',
            strength: '500mg',
            form: 'Tablet',
            dosage: 'As directed by physician',
            notes: 'Consult with healthcare provider for appropriate medication.'
          }
        ];
        setDrugRecommendations(generalDrugs);
      }
    } catch (error) {
      console.error('Error loading drug recommendations:', error);
      setDrugRecommendations([]);
    }
  };

  const saveDiagnosis = async () => {
    if (!diagnosisResult || !user) return;

    setSaving(true);
    try {
      const topDiagnosis = diagnosisResult.diagnoses[0];
      
      // Save to user_assessments table
      const { error } = await supabase
        .from('user_assessments')
        .insert({
          user_id: user.id,
          condition_id: topDiagnosis.condition_id || null,
          symptoms: symptoms,
          answers: answers,
          recommended_drugs: drugRecommendations,
          probability: topDiagnosis.probability,
          session_id: diagnosisResult.session_id,
          reasoning: topDiagnosis.explanation || 'AI analysis based on reported symptoms and answers'
        });

      if (error) throw error;

      toast.success('Diagnosis saved to your history!');
    } catch (error) {
      console.error('Error saving diagnosis:', error);
      toast.error('Failed to save diagnosis.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="h-16 w-16 text-primary mx-auto mb-4" />
          </motion.div>
          <h3 className="text-2xl font-bold mb-2">Analyzing Your Symptoms</h3>
          <p className="text-lg text-muted-foreground mb-4">
            Our AI is processing your information...
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            This may take a few moments
          </div>
        </div>
      </div>
    );
  }

  if (!diagnosisResult) {
    return (
      <div className="text-center py-20">
        {error ? (
          <div className="space-y-4">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Analysis Error</h3>
            <p className="text-lg text-muted-foreground mb-6">
              {error}
            </p>
            <Button onClick={onStartNew}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Analysis Failed</h3>
            <p className="text-lg text-muted-foreground mb-6">
              We couldn't complete the diagnosis. Please try again.
            </p>
            <Button onClick={onStartNew}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Start New Diagnosis
            </Button>
          </div>
        )}
      </div>
    );
  }

  const topDiagnosis = diagnosisResult.diagnoses?.[0];
  const isEmergency = diagnosisResult.emergency;

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center sticky top-0 bg-background/95 backdrop-blur py-4 z-10"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Brain className="h-16 w-16 text-primary" />
          <TrendingUp className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Diagnosis Results</h2>
        <p className="text-muted-foreground text-lg">
          Based on your symptoms and answers
        </p>
      </motion.div>

      {/* Emergency Alert */}
      {isEmergency && (
        <Alert className="border-destructive bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive font-medium">
            {diagnosisResult.alert_message}
          </AlertDescription>
        </Alert>
      )}

      {/* Your Symptoms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Your Reported Symptoms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {symptoms.map((symptom) => (
              <Badge key={symptom} variant="outline">
                {symptom}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Diagnosis */}
      {topDiagnosis && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Most Likely Condition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">{topDiagnosis.condition_name}</h3>
              <Badge className="bg-primary text-primary-foreground text-lg px-3 py-1">
                {Math.round(topDiagnosis.probability * 100)}% Match
              </Badge>
            </div>
            
            <p className="text-muted-foreground">
              {topDiagnosis.explanation}
            </p>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="font-medium">Severity:</span>
                <Badge variant={
                  topDiagnosis.severity === 'high' ? 'destructive' : 
                  topDiagnosis.severity === 'moderate' ? 'default' : 'secondary'
                }>
                  {topDiagnosis.severity}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Confidence:</span>
                <Badge variant="outline">{topDiagnosis.confidence}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Possible Conditions */}
      {diagnosisResult.diagnoses && diagnosisResult.diagnoses.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Other Possible Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {diagnosisResult.diagnoses.slice(1).map((diagnosis: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium">{diagnosis.condition_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {diagnosis.explanation}
                  </p>
                </div>
                <Badge variant="outline">
                  {Math.round(diagnosis.probability * 100)}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Drug Recommendations */}
      {drugRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              Recommended Medications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                These are general recommendations. Always consult with a healthcare provider before taking any medication.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              {drugRecommendations.map((drug) => (
                <div key={drug.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-lg">{drug.drug_name}</h4>
                    {drug.rxnorm_id && (
                      <Badge variant="outline" className="text-xs">
                        RxNorm: {drug.rxnorm_id}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mb-2">
                    {drug.strength && (
                      <div>
                        <span className="font-medium">Strength:</span> {drug.strength}
                      </div>
                    )}
                    {drug.form && (
                      <div>
                        <span className="font-medium">Form:</span> {drug.form}
                      </div>
                    )}
                    {drug.dosage && (
                      <div>
                        <span className="font-medium">Dosage:</span> {drug.dosage}
                      </div>
                    )}
                  </div>
                  
                  {drug.notes && (
                    <p className="text-sm text-muted-foreground italic">
                      {drug.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Important Disclaimer */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Medical Disclaimer:</strong> This AI analysis is for informational purposes only and should not replace professional medical advice. 
          Please consult with a qualified healthcare provider for proper diagnosis and treatment.
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={saveDiagnosis}
          disabled={saving}
          className="flex-1"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Save Diagnosis
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={onViewHistory}
          className="flex-1"
        >
          <History className="h-4 w-4 mr-2" />
          View History
        </Button>
        
        <Button
          variant="outline"
          onClick={onStartNew}
          className="flex-1"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          New Diagnosis
        </Button>
      </div>
    </div>
  );
};
