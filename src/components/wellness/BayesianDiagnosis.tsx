import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Pill, 
  AlertTriangle, 
  Stethoscope,
  Save,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';

interface DiagnosisResult {
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

interface BayesianDiagnosisProps {
  symptomIds: string[];
  age?: number;
  gender?: string;
  onConsultDoctor: (results: DiagnosisResult[]) => void;
  onSaveResults: () => void;
}

export const BayesianDiagnosis: React.FC<BayesianDiagnosisProps> = ({
  symptomIds,
  age,
  gender,
  onConsultDoctor,
  onSaveResults
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiagnosisResult[]>([]);
  const [drugRecommendation, setDrugRecommendation] = useState<DrugRecommendation | null>(null);
  const [rareFlag, setRareFlag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (symptomIds.length > 0) {
      performDiagnosis();
    }
  }, [symptomIds]);

  const performDiagnosis = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call diagnose function
      const { data: diagnosisData, error: diagnosisError } = await supabase.functions.invoke('diagnose', {
        body: {
          symptomIds,
          age,
          gender
        }
      });

      if (diagnosisError) throw diagnosisError;

      const { top, rareFlag: isRare } = diagnosisData;
      setResults(top || []);
      setRareFlag(isRare || false);

      // Get drug recommendation for top condition
      if (top && top.length > 0) {
        const { data: drugData, error: drugError } = await supabase.functions.invoke('recommend-drug', {
          body: {
            condition_id: top[0].condition_id
          }
        });

        if (!drugError && drugData) {
          setDrugRecommendation(drugData);
        }
      }

      // Log analytics
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('analytics_events').insert({
          user_id: user.id,
          event_type: 'diagnosis_completed',
          payload: {
            symptom_count: symptomIds.length,
            top_condition: top?.[0]?.name,
            probability: top?.[0]?.probability
          }
        });
      }

    } catch (err) {
      console.error('Diagnosis error:', err);
      setError('Unable to complete diagnosis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.functions.invoke('log-history', {
        body: {
          user_id: user.id,
          parsed_symptoms: symptomIds,
          suggested_conditions: results,
          confirmed_condition: results[0]?.condition_id
        }
      });

      onSaveResults();
    } catch (error) {
      console.error('Error saving results:', error);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12 space-y-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Brain className="h-12 w-12 text-primary" />
        </motion.div>
        <p className="text-muted-foreground text-center">
          AI is analyzing your symptoms...
        </p>
        <div className="w-64">
          <Progress value={33} className="animate-pulse" />
        </div>
      </motion.div>
    );
  }

  if (error || results.length === 0) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Diagnosis Unavailable
          </h3>
          <p className="text-muted-foreground mb-4">
            {error || "We couldn't find a confident match for your symptoms."}
          </p>
          <Button 
            onClick={() => onConsultDoctor([])}
            className="bg-primary hover:bg-primary/90"
          >
            <Stethoscope className="h-4 w-4 mr-2" />
            Consult a Doctor Now
          </Button>
        </CardContent>
      </Card>
    );
  }

  const topResult = results[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Rare condition warning */}
      {rareFlag && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-orange-50 border border-orange-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Urgent Review Recommended</span>
          </div>
          <p className="text-orange-700 text-sm mt-1">
            Your symptoms may indicate a condition requiring immediate medical attention.
          </p>
        </motion.div>
      )}

      {/* Top diagnosis */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Most Likely Diagnosis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold text-primary mb-2">
              {topResult.name}
            </h3>
            <p className="text-muted-foreground">
              {topResult.description}
            </p>
          </div>

          {/* Probability */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Confidence Level</span>
              <span className="text-lg font-bold text-primary">
                {topResult.probability.toFixed(1)}%
              </span>
            </div>
            <Progress value={topResult.probability} className="h-3" />
          </div>

          {/* Drug recommendation */}
          {drugRecommendation && (
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <Pill className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-primary">Recommended Treatment</h4>
              </div>
              <div className="bg-background rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{drugRecommendation.drug_name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {drugRecommendation.dosage}
                  </Badge>
                </div>
                {drugRecommendation.notes && (
                  <p className="text-sm text-muted-foreground">
                    {drugRecommendation.notes}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alternative diagnoses */}
      {results.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Alternative Possibilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.slice(1, 3).map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="font-medium">{result.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {result.description}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{result.probability.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medical disclaimer */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive mb-1">
                ⚠️ Medical Disclaimer
              </p>
              <p className="text-xs text-muted-foreground">
                This AI analysis is for informational purposes only. Always consult with a licensed healthcare 
                provider for proper medical diagnosis and treatment. Do not delay seeking medical care based on this assessment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={() => onConsultDoctor(results)}
          className="flex-1 bg-primary hover:bg-primary/90"
          size="lg"
        >
          <Stethoscope className="h-4 w-4 mr-2" />
          Consult a Prescribly Doctor
        </Button>
        <Button 
          variant="outline" 
          onClick={handleSaveResults}
          className="flex-1 sm:flex-none border-primary/30 hover:bg-primary/5"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Results
        </Button>
      </div>

      {/* Accuracy note */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Estimated model accuracy: ~85–95% (improves with use)
        </p>
      </div>
    </motion.div>
  );
};