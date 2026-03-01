import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PendingPrescriptionCard } from '@/components/PendingPrescriptionCard';
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
  Info,
  Download,
  Share,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { generateDiagnosisPDF, downloadPDF, shareOnWhatsApp } from '@/utils/pdfGenerator';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drugRecommendations, setDrugRecommendations] = useState<any[]>([]);
  const [pendingSubmitted, setPendingSubmitted] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const inFlightRef = useRef(false);

  // Get diagnosis from backend
  useEffect(() => {
    const getDiagnosis = async () => {
      // Prevent multiple simultaneous calls
      if (inFlightRef.current) {
        console.log('Diagnosis request already in progress, skipping...');
        return;
      }

      // Input validation
      if (!symptoms || symptoms.length === 0) {
        setError('No symptoms provided. Please go back and add symptoms.');
        setLoading(false);
        return;
      }

      inFlightRef.current = true;
      setLoading(true);
      setError(null);

      // Set timeout fallback
      const timeout = setTimeout(() => {
        setError('The diagnosis is taking longer than expected. Please try again.');
        setLoading(false);
        inFlightRef.current = false;
      }, 15000);

      try {
        // Prepare payload for diagnosis
        const payload = {
          symptoms: symptoms,
          answers: answers,
          user_id: user?.id,
          session_id: crypto.randomUUID()
        };
        setSessionId(payload.session_id);

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
        
        // Save drugs to pending_drug_approvals and auto-save diagnosis
        if (data.diagnoses && data.diagnoses.length > 0 && user) {
          const topDiag = data.diagnoses[0];
          // Load drugs then submit for approval
          const drugsForApproval = await loadDrugRecommendations(topDiag.condition_id);
          if (drugsForApproval && drugsForApproval.length > 0) {
            await submitForDoctorApproval(payload.session_id, topDiag, drugsForApproval);
          }
        }

        // Auto-save diagnosis to history
        setTimeout(() => {
          saveDiagnosis();
        }, 1000);
      } catch (error) {
        console.error('Error getting diagnosis:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(`Failed to get diagnosis: ${errorMessage}`);
        toast.error('Failed to get diagnosis. Please try again.');
      } finally {
        clearTimeout(timeout);
        setLoading(false);
        inFlightRef.current = false;
      }
    };

    getDiagnosis();
  }, [symptoms, answers, user?.id]);

  const loadDrugRecommendations = async (conditionId: number): Promise<any[]> => {
    try {
      console.log('Loading drug recommendations for condition ID:', conditionId);
      
      const { data: drugsData, error: drugsError } = await supabase
        .from('drugs')
        .select('id, drug_name, rxnorm_id, strength, form, dosage, notes')
        .eq('condition_id', conditionId)
        .limit(5);

      console.log('Drugs query result:', { drugsData, drugsError });

      if (drugsError) {
        console.error('Error fetching drugs:', drugsError);
        const fallbackDrugs = [
          {
            id: 1, drug_name: 'Acetaminophen', rxnorm_id: '161', strength: '500mg',
            form: 'Tablet', dosage: '1-2 tablets every 4-6 hours as needed',
            notes: 'For pain and fever relief. Do not exceed 4000mg in 24 hours.'
          }
        ];
        setDrugRecommendations(fallbackDrugs);
        return fallbackDrugs;
      }

      if (drugsData && drugsData.length > 0) {
        setDrugRecommendations(drugsData);
        return drugsData;
      } else {
        const generalDrugs = [
          {
            id: 1, drug_name: 'General Pain Relief', rxnorm_id: '161', strength: '500mg',
            form: 'Tablet', dosage: 'As directed by physician',
            notes: 'Consult with healthcare provider for appropriate medication.'
          }
        ];
        setDrugRecommendations(generalDrugs);
        return generalDrugs;
      }
    } catch (error) {
      console.error('Error loading drug recommendations:', error);
      setDrugRecommendations([]);
      return [];
    }
  };

  const submitForDoctorApproval = async (diagSessionId: string, topDiagnosis: any, drugs: any[]) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('pending_drug_approvals')
        .insert({
          patient_id: user.id,
          diagnosis_session_id: diagSessionId,
          condition_name: topDiagnosis.condition_name,
          condition_id: topDiagnosis.condition_id || null,
          drugs: drugs,
          status: 'pending'
        });

      if (error) {
        console.error('Error submitting for doctor approval:', error);
      } else {
        setPendingSubmitted(true);
      }
    } catch (err) {
      console.error('Error submitting for approval:', err);
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

      toast.success('Diagnosis automatically saved to your history!');
    } catch (error) {
      console.error('Error saving diagnosis:', error);
      toast.error('Failed to save diagnosis.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!diagnosisResult) return;

    setGeneratingPDF(true);
    try {
      const pdfBlob = await generateDiagnosisPDF(
        {
          symptoms: diagnosisResult.input_symptoms || symptoms,
          diagnoses: diagnosisResult.diagnoses,
          emergency: diagnosisResult.emergency,
          alert_message: diagnosisResult.alert_message
        },
        drugRecommendations,
        user?.email || 'Patient'
      );
      
      const filename = `diagnosis-report-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadPDF(pdfBlob, filename);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!diagnosisResult) return;

    setGeneratingPDF(true);
    try {
      const pdfBlob = await generateDiagnosisPDF(
        {
          symptoms: diagnosisResult.input_symptoms || symptoms,
          diagnoses: diagnosisResult.diagnoses,
          emergency: diagnosisResult.emergency,
          alert_message: diagnosisResult.alert_message
        },
        drugRecommendations,
        user?.email || 'Patient'
      );
      
      const filename = `diagnosis-report-${new Date().toISOString().split('T')[0]}.pdf`;
      await shareOnWhatsApp(pdfBlob, filename);
      toast.success('Opening WhatsApp to share your report!');
    } catch (error) {
      console.error('Error sharing on WhatsApp:', error);
      toast.error('Failed to share on WhatsApp. Please try downloading instead.');
    } finally {
      setGeneratingPDF(false);
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

      {/* Drug Recommendations - Now requires doctor approval */}
      {drugRecommendations.length > 0 && topDiagnosis && (
        <PendingPrescriptionCard
          sessionId={sessionId}
          conditionName={topDiagnosis.condition_name}
          drugs={drugRecommendations}
        />
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
      <div className="space-y-4">
        {/* Primary Action - Book Appointment */}
        <Button
          onClick={() => navigate('/book-appointment')}
          className="w-full"
          variant="default"
          size="lg"
        >
          <Calendar className="h-5 w-5 mr-2" />
          Book an Appointment with a Doctor
        </Button>

        {/* PDF Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleDownloadPDF}
            disabled={generatingPDF}
            className="flex-1"
            variant="default"
          >
            {generatingPDF ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF Report
              </>
            )}
          </Button>
          
          <Button
            onClick={handleShareWhatsApp}
            disabled={generatingPDF}
            className="flex-1"
            variant="outline"
          >
            {generatingPDF ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Share className="h-4 w-4 mr-2" />
                Share on WhatsApp
              </>
            )}
          </Button>
        </div>

        {/* Other Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={saveDiagnosis}
            disabled={saving}
            className="flex-1"
            variant="secondary"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                {/* Auto-save confirmation or manual save */}
                Save to History
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
    </div>
  );
};
