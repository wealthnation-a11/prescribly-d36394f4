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
  Calendar,
  Lock,
  Stethoscope,
  MessageSquare,
  Send,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [doctorApproved, setDoctorApproved] = useState(false);
  const [sendingToDoctor, setSendingToDoctor] = useState(false);
  const inFlightRef = useRef(false);

  const handleApprovalStatusChange = (status: string) => {
    if (status === 'approved') {
      setDoctorApproved(true);
    }
  };

  // Get diagnosis from backend
  useEffect(() => {
    const getDiagnosis = async () => {
      if (inFlightRef.current) return;
      if (!symptoms || symptoms.length === 0) {
        setError('No symptoms provided. Please go back and add symptoms.');
        setLoading(false);
        return;
      }

      inFlightRef.current = true;
      setLoading(true);
      setError(null);

      const timeout = setTimeout(() => {
        setError('The diagnosis is taking longer than expected. Please try again.');
        setLoading(false);
        inFlightRef.current = false;
      }, 15000);

      try {
        const payload = {
          symptoms: symptoms,
          answers: answers,
          user_id: user?.id,
          session_id: crypto.randomUUID()
        };
        setSessionId(payload.session_id);

        const { data, error } = await supabase.functions.invoke('diagnose-symptoms', {
          body: payload
        });

        if (error) throw error;
        setDiagnosisResult(data);
        
        if (data.diagnoses && data.diagnoses.length > 0) {
          const topConditionId = data.diagnoses[0].condition_id;
          await loadDrugRecommendations(topConditionId);
        }

        onComplete(data);
        
        if (data.diagnoses && data.diagnoses.length > 0 && user) {
          const topDiag = data.diagnoses[0];
          const drugsForApproval = await loadDrugRecommendations(topDiag.condition_id);
          if (drugsForApproval && drugsForApproval.length > 0) {
            await submitForDoctorApproval(payload.session_id, topDiag, drugsForApproval);
          }
        }

        setTimeout(() => { saveDiagnosis(); }, 1000);
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
      const { data: drugsData, error: drugsError } = await supabase
        .from('drugs')
        .select('id, drug_name, rxnorm_id, strength, form, dosage, notes')
        .eq('condition_id', conditionId)
        .limit(5);

      if (drugsError) {
        const fallbackDrugs = [
          { id: 1, drug_name: 'Acetaminophen', rxnorm_id: '161', strength: '500mg', form: 'Tablet', dosage: '1-2 tablets every 4-6 hours as needed', notes: 'For pain and fever relief. Do not exceed 4000mg in 24 hours.' }
        ];
        setDrugRecommendations(fallbackDrugs);
        return fallbackDrugs;
      }

      if (drugsData && drugsData.length > 0) {
        setDrugRecommendations(drugsData);
        return drugsData;
      } else {
        const generalDrugs = [
          { id: 1, drug_name: 'General Pain Relief', rxnorm_id: '161', strength: '500mg', form: 'Tablet', dosage: 'As directed by physician', notes: 'Consult with healthcare provider for appropriate medication.' }
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
      if (!error) setPendingSubmitted(true);
    } catch (err) {
      console.error('Error submitting for approval:', err);
    }
  };

  const saveDiagnosis = async () => {
    if (!diagnosisResult || !user) return;
    setSaving(true);
    try {
      const topDiagnosis = diagnosisResult.diagnoses[0];
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
        { symptoms: diagnosisResult.input_symptoms || symptoms, diagnoses: diagnosisResult.diagnoses, emergency: diagnosisResult.emergency, alert_message: diagnosisResult.alert_message },
        drugRecommendations, user?.email || 'Patient'
      );
      const filename = `diagnosis-report-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadPDF(pdfBlob, filename);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
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
        { symptoms: diagnosisResult.input_symptoms || symptoms, diagnoses: diagnosisResult.diagnoses, emergency: diagnosisResult.emergency, alert_message: diagnosisResult.alert_message },
        drugRecommendations, user?.email || 'Patient'
      );
      const filename = `diagnosis-report-${new Date().toISOString().split('T')[0]}.pdf`;
      await shareOnWhatsApp(pdfBlob, filename);
      toast.success('Opening WhatsApp to share your report!');
    } catch (error) {
      toast.error('Failed to share on WhatsApp. Please try downloading instead.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleForwardToDoctor = async () => {
    if (!diagnosisResult || !user) return;
    setSendingToDoctor(true);
    try {
      // Navigate to booking with diagnosis context
      navigate('/book-appointment/chat', {
        state: {
          diagnosisSessionId: sessionId,
          conditionName: diagnosisResult.diagnoses?.[0]?.condition_name,
          symptoms: symptoms,
          forwardDiagnosis: true
        }
      });
    } finally {
      setSendingToDoctor(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 md:py-20 px-4">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="h-12 w-12 md:h-16 md:w-16 text-primary mx-auto mb-4" />
          </motion.div>
          <h3 className="text-xl md:text-2xl font-bold mb-2">Analyzing Your Symptoms</h3>
          <p className="text-base md:text-lg text-muted-foreground mb-4">
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
      <div className="text-center py-12 md:py-20 px-4">
        {error ? (
          <div className="space-y-4">
            <AlertTriangle className="h-12 w-12 md:h-16 md:w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl md:text-2xl font-bold mb-2">Analysis Error</h3>
            <p className="text-base md:text-lg text-muted-foreground mb-6">{error}</p>
            <Button onClick={onStartNew}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <AlertTriangle className="h-12 w-12 md:h-16 md:w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl md:text-2xl font-bold mb-2">Analysis Failed</h3>
            <p className="text-base md:text-lg text-muted-foreground mb-6">
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
    <div className="space-y-4 md:space-y-6 pb-6 px-2 md:px-0 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center sticky top-0 bg-background/95 backdrop-blur py-3 md:py-4 z-10"
      >
        <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
          <Brain className="h-10 w-10 md:h-16 md:w-16 text-primary" />
          <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Diagnosis Results</h2>
        <p className="text-muted-foreground text-sm md:text-lg">
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
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Info className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Your Reported Symptoms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {symptoms.map((symptom) => (
              <Badge key={symptom} variant="outline" className="text-xs md:text-sm">
                {symptom}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Blurred Results Section with Overlay */}
      <div className="relative">
        {/* Blurred content when not approved */}
        <div className={!doctorApproved ? 'filter blur-[6px] pointer-events-none select-none' : ''}>
          {/* Top Diagnosis */}
          {topDiagnosis && (
            <Card className="border-primary/30 bg-primary/5 mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg md:text-xl text-primary">Most Likely Condition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <h3 className="text-xl md:text-2xl font-bold">{topDiagnosis.condition_name}</h3>
                  <Badge className="bg-primary text-primary-foreground text-sm md:text-lg px-3 py-1">
                    {Math.round(topDiagnosis.probability * 100)}% Match
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm md:text-base">{topDiagnosis.explanation}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Severity:</span>
                    <Badge variant={topDiagnosis.severity === 'high' ? 'destructive' : topDiagnosis.severity === 'moderate' ? 'default' : 'secondary'}>
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
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg">Other Possible Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 md:space-y-3">
                {diagnosisResult.diagnoses.slice(1).map((diagnosis: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 md:p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm md:text-base truncate">{diagnosis.condition_name}</h4>
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{diagnosis.explanation}</p>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0">
                      {Math.round(diagnosis.probability * 100)}%
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Drug Recommendations */}
          {drugRecommendations.length > 0 && topDiagnosis && (
            <PendingPrescriptionCard
              sessionId={sessionId}
              conditionName={topDiagnosis.condition_name}
              drugs={drugRecommendations}
              onStatusChange={handleApprovalStatusChange}
            />
          )}
        </div>

        {/* Glass overlay when not approved */}
        <AnimatePresence>
          {!doctorApproved && !loading && diagnosisResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 flex items-center justify-center z-20 p-4"
            >
              <Card className="w-full max-w-md mx-auto border-primary/30 bg-background/80 backdrop-blur-xl shadow-2xl">
                <CardContent className="p-6 md:p-8 text-center space-y-5">
                  <div className="relative mx-auto w-16 h-16 md:w-20 md:h-20">
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                    <div className="relative flex items-center justify-center w-full h-full rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                      <Stethoscope className="h-8 w-8 md:h-10 md:w-10 text-primary-foreground" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-lg md:text-xl font-bold">Doctor Verification Required</h3>
                    </div>
                    <p className="text-muted-foreground text-sm md:text-base">
                      Your diagnosis results are ready, but need to be reviewed and confirmed by a licensed doctor before you can view them.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        size="lg"
                        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg text-base md:text-lg py-5 md:py-6"
                        onClick={() => navigate('/book-appointment/chat', {
                          state: {
                            diagnosisSessionId: sessionId,
                            conditionName: topDiagnosis?.condition_name,
                            symptoms: symptoms,
                          }
                        })}
                      >
                        <MessageSquare className="h-5 w-5 mr-2" />
                        Chat or Call a Doctor Now
                      </Button>
                    </motion.div>
                    
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/book-appointment')}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Book an Appointment Instead
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    A doctor will review your AI diagnosis and approve the results.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Important Disclaimer */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs md:text-sm">
          <strong>Medical Disclaimer:</strong> This AI analysis is for informational purposes only and should not replace professional medical advice. 
          Please consult with a qualified healthcare provider for proper diagnosis and treatment.
        </AlertDescription>
      </Alert>

      {/* Forward to Doctor Button - appears after approval */}
      <AnimatePresence>
        {doctorApproved && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-700 dark:text-green-400">Doctor Approved!</h4>
                    <p className="text-sm text-muted-foreground">Your diagnosis has been reviewed and approved. You can now forward it to your doctor.</p>
                  </div>
                  <Button
                    onClick={handleForwardToDoctor}
                    disabled={sendingToDoctor}
                    className="bg-green-600 hover:bg-green-700 shrink-0"
                  >
                    {sendingToDoctor ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Send to Doctor
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="space-y-3 md:space-y-4">
        {/* PDF Actions */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <Button
            onClick={handleDownloadPDF}
            disabled={generatingPDF}
            className="flex-1"
            variant="default"
          >
            {generatingPDF ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating PDF...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" />Download PDF Report</>
            )}
          </Button>
          
          <Button
            onClick={handleShareWhatsApp}
            disabled={generatingPDF}
            className="flex-1"
            variant="outline"
          >
            {generatingPDF ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating PDF...</>
            ) : (
              <><Share className="h-4 w-4 mr-2" />Share on WhatsApp</>
            )}
          </Button>
        </div>

        {/* Other Actions */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <Button
            onClick={saveDiagnosis}
            disabled={saving}
            className="flex-1"
            variant="secondary"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><FileText className="h-4 w-4 mr-2" />Save to History</>
            )}
          </Button>
          
          <Button variant="outline" onClick={onViewHistory} className="flex-1">
            <History className="h-4 w-4 mr-2" />
            View History
          </Button>
          
          <Button variant="outline" onClick={onStartNew} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            New Diagnosis
          </Button>
        </div>
      </div>
    </div>
  );
};
