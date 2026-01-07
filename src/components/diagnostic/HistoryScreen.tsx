import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  History, 
  Calendar, 
  TrendingUp, 
  FileText, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Brain,
  Pill
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface HistoryScreenProps {
  onStartNew: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onStartNew
}) => {
  const { user } = useAuth();
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Load diagnosis history and prescriptions
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Load diagnosis assessments from user_assessments table
        const { data: assessmentsData, error: assessmentsError } = await supabase
          .from('user_assessments')
          .select(`
            id,
            created_at,
            condition_id,
            symptoms,
            answers,
            recommended_drugs,
            probability,
            reasoning,
            session_id,
            conditions(name, description)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(15);

        if (assessmentsError) throw assessmentsError;

        // Load prescriptions from prescriptions table
        const { data: prescriptionsData, error: prescriptionsError } = await supabase
          .from('prescriptions')
          .select(`
            id,
            created_at,
            medications,
            diagnosis,
            instructions,
            status,
            issued_at,
            doctor_id
          `)
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (prescriptionsError) {
          console.warn('Error loading prescriptions:', prescriptionsError);
        }

        // Load prescriptions from prescriptions_v2 table  
        const { data: prescriptionsV2Data, error: prescriptionsV2Error } = await supabase
          .from('prescriptions_v2')
          .select(`
            id,
            created_at,
            drugs,
            status,
            doctor_id
          `)
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (prescriptionsV2Error) {
          console.warn('Error loading prescriptions v2:', prescriptionsV2Error);
        }

        // Process assessments
        const processedAssessments = assessmentsData?.map((assessment: any) => ({
          id: assessment.id,
          created_at: assessment.created_at,
          type: 'diagnosis',
          payload: {
            condition_name: assessment.conditions?.name || 'General Health Assessment',
            description: assessment.conditions?.description || 'AI-powered health analysis based on your symptoms.',
            icd10_code: assessment.conditions?.icd10_code || '',
            probability: assessment.probability || 0,
            symptoms: assessment.symptoms || [],
            answers: assessment.answers || {},
            recommended_drugs: assessment.recommended_drugs || [],
            reasoning: assessment.reasoning || 'AI analysis completed successfully.',
            session_id: assessment.session_id
          }
        })) || [];

        // Process prescriptions
        const processedPrescriptions = prescriptionsData?.map((prescription: any) => ({
          id: prescription.id,
          created_at: prescription.created_at,
          type: 'prescription',
          payload: {
            medications: prescription.medications || [],
            diagnosis: prescription.diagnosis || 'Medical consultation',
            instructions: prescription.instructions || '',
            status: prescription.status || 'pending',
            doctor_id: prescription.doctor_id,
            issued_at: prescription.issued_at
          }
        })) || [];

        // Process prescriptions v2
        const processedPrescriptionsV2 = prescriptionsV2Data?.map((prescription: any) => ({
          id: prescription.id,
          created_at: prescription.created_at,
          type: 'prescription_v2',
          payload: {
            drugs: prescription.drugs || [],
            status: prescription.status || 'approved',
            doctor_id: prescription.doctor_id
          }
        })) || [];

        // Combine all history items and sort by date
        const allHistory = [
          ...processedAssessments,
          ...processedPrescriptions,
          ...processedPrescriptionsV2
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setHistoryData(allHistory);
      } catch (error) {
        console.error('Error loading history:', error);
        toast.error('Failed to load medical history');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user]);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return 'bg-green-500';
    if (probability >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProbabilityLabel = (probability: number) => {
    if (probability >= 0.7) return 'High Confidence';
    if (probability >= 0.4) return 'Moderate Confidence';
    return 'Low Confidence';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-lg text-muted-foreground">Loading your diagnosis history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <History className="h-16 w-16 text-primary mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-2">Medical History</h2>
        <p className="text-muted-foreground text-lg">
          Your previous AI health assessments, diagnoses, and prescriptions
        </p>
      </motion.div>

      {/* Stats Summary */}
      {historyData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {historyData.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Records
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {historyData.filter(item => item.type === 'diagnosis').length}
              </div>
              <div className="text-sm text-muted-foreground">
                Diagnoses
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {historyData.filter(item => item.type === 'prescription' || item.type === 'prescription_v2').length}
              </div>
              <div className="text-sm text-muted-foreground">
                Prescriptions
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History List */}
      {historyData.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Medical History</h3>
            <p className="text-muted-foreground mb-6">
              You haven't completed any health assessments or received prescriptions yet.
            </p>
            <Button onClick={onStartNew}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Start Your First Assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {historyData.map((item) => {
            const isExpanded = expandedItems.has(item.id);
            const payload = item.payload || {};
            const symptoms = payload.symptoms || [];
            const answers = payload.answers || {};
            
            // Get the appropriate icon and title based on type
            const getItemIcon = () => {
              if (item.type === 'diagnosis') return <Brain className="h-4 w-4 text-primary" />;
              return <Pill className="h-4 w-4 text-green-600" />;
            };

            const getItemTitle = () => {
              if (item.type === 'diagnosis') {
                return payload.condition_name || 'Health Assessment';
              } else if (item.type === 'prescription') {
                return payload.diagnosis || 'Medical Prescription';
              } else if (item.type === 'prescription_v2') {
                return 'Medical Prescription';
              }
              return 'Medical Record';
            };

            const getItemSubtitle = () => {
              if (item.type === 'diagnosis') {
                return 'AI Health Assessment';
              } else if (item.type === 'prescription' || item.type === 'prescription_v2') {
                return `Prescription - ${payload.status || 'pending'}`;
              }
              return 'Medical Record';
            };

            const getStatusBadge = () => {
              if (item.type === 'diagnosis') {
                return (
                  <Badge className={`${getProbabilityColor(payload.probability || 0)} text-white`}>
                    {Math.round((payload.probability || 0) * 100)}%
                  </Badge>
                );
              } else if (item.type === 'prescription' || item.type === 'prescription_v2') {
                const status = payload.status || 'pending';
                const statusColor = status === 'approved' ? 'bg-green-500' : 
                                  status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500';
                return (
                  <Badge className={`${statusColor} text-white capitalize`}>
                    {status}
                  </Badge>
                );
              }
              return null;
            };
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="cursor-pointer" onClick={() => toggleExpanded(item.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getItemIcon()}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(item.created_at), 'MMM dd, yyyy - HH:mm')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge()}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <h3 className="text-xl font-semibold">
                        {getItemTitle()}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {getItemSubtitle()}
                      </p>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="border-t">
                      <div className="space-y-4">
                        {/* Diagnosis-specific content */}
                        {item.type === 'diagnosis' && (
                          <>
                            {/* Condition Details */}
                            {payload.description && (
                              <div>
                                <h4 className="font-medium mb-2">About This Condition</h4>
                                <p className="text-sm text-muted-foreground">{payload.description}</p>
                                {payload.icd10_code && (
                                  <Badge variant="outline" className="mt-2">
                                    ICD-10: {payload.icd10_code}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Why This Was Suggested */}
                            {payload.reasoning && (
                              <div>
                                <h4 className="font-medium mb-2">Why This Was Suggested</h4>
                                <p className="text-sm text-muted-foreground">{payload.reasoning}</p>
                              </div>
                            )}

                            {/* Confidence Level */}
                            {payload.probability !== undefined && (
                              <div>
                                <h4 className="font-medium mb-2">Confidence Level</h4>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-muted rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${getProbabilityColor(payload.probability || 0)}`}
                                      style={{ width: `${(payload.probability || 0) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium">
                                    {getProbabilityLabel(payload.probability || 0)}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Symptoms */}
                            {symptoms.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Reported Symptoms</h4>
                                <div className="flex flex-wrap gap-2">
                                  {symptoms.map((symptom: string, index: number) => (
                                    <Badge key={index} variant="outline">
                                      {symptom}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Recommended Medications from Assessment */}
                            {payload.recommended_drugs && payload.recommended_drugs.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <Pill className="h-4 w-4" />
                                  Recommended Medications
                                </h4>
                                <div className="space-y-2">
                                  {payload.recommended_drugs.map((drug: any, drugIndex: number) => (
                                    <div key={drugIndex} className="p-3 bg-muted/50 rounded-lg">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <h5 className="font-medium">{drug.drug_name}</h5>
                                          {drug.dosage && (
                                            <p className="text-sm text-muted-foreground">{drug.dosage}</p>
                                          )}
                                          {drug.notes && (
                                            <p className="text-xs text-muted-foreground mt-1 italic">{drug.notes}</p>
                                          )}
                                        </div>
                                        {drug.rxnorm_id && (
                                          <Badge variant="outline" className="text-xs">
                                            RxNorm: {drug.rxnorm_id}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground italic mt-2">
                                  This is an AI-powered health suggestion. Please consult a doctor before starting any medication.
                                </p>
                              </div>
                            )}

                            {/* Key Answers */}
                            {Object.keys(answers).length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Your Answers</h4>
                                <div className="space-y-2 text-sm">
                                  {Object.entries(answers).slice(0, 5).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="text-muted-foreground capitalize">
                                        {key.replace(/_/g, ' ')}:
                                      </span>
                                      <span className="font-medium">{value as string}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Prescription-specific content */}
                        {(item.type === 'prescription' || item.type === 'prescription_v2') && (
                          <>
                            {/* Diagnosis/Condition */}
                            {payload.diagnosis && (
                              <div>
                                <h4 className="font-medium mb-2">Diagnosis</h4>
                                <p className="text-sm text-muted-foreground">{payload.diagnosis}</p>
                              </div>
                            )}

                            {/* Prescribed Medications */}
                            {((payload.medications && payload.medications.length > 0) || 
                              (payload.drugs && payload.drugs.length > 0)) && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <Pill className="h-4 w-4" />
                                  Prescribed Medications
                                </h4>
                                <div className="space-y-2">
                                  {(payload.medications || payload.drugs || []).map((medication: any, medIndex: number) => (
                                    <div key={medIndex} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <h5 className="font-medium">
                                            {medication.name || medication.drug_name || medication.medication || 'Medication'}
                                          </h5>
                                          {(medication.dosage || medication.dose) && (
                                            <p className="text-sm text-muted-foreground">
                                              {medication.dosage || medication.dose}
                                            </p>
                                          )}
                                          {(medication.instructions || medication.notes) && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {medication.instructions || medication.notes}
                                            </p>
                                          )}
                                          {medication.frequency && (
                                            <p className="text-xs text-muted-foreground">
                                              Frequency: {medication.frequency}
                                            </p>
                                          )}
                                        </div>
                                        <Badge variant="outline" className="text-xs bg-green-100">
                                          Prescribed
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Instructions */}
                            {payload.instructions && (
                              <div>
                                <h4 className="font-medium mb-2">Doctor's Instructions</h4>
                                <p className="text-sm text-muted-foreground">{payload.instructions}</p>
                              </div>
                            )}
                          </>
                        )}

                        <Separator />

                        {/* Record Info */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {item.type === 'diagnosis' ? `Session: ${payload.session_id?.slice(0, 8)}...` : 
                             `Record ID: ${item.id.slice(0, 8)}...`}
                          </span>
                          <span>
                            {item.type === 'diagnosis' ? 'Health Assessment' : 
                             item.type === 'prescription' ? 'Medical Prescription' : 
                             'Prescription v2'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 pt-6">
        <Button onClick={onStartNew} size="lg">
          <RotateCcw className="h-4 w-4 mr-2" />
          New Health Assessment
        </Button>
      </div>
    </div>
  );
};