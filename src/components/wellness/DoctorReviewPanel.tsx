import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Stethoscope, 
  CheckCircle, 
  Edit3, 
  XCircle, 
  Clock,
  User,
  Calendar,
  FileText,
  AlertTriangle,
  Pill
} from 'lucide-react';
import { motion } from 'framer-motion';

interface DiagnosisSession {
  id: string;
  user_id: string;
  symptoms: string[];
  conditions: any[];
  status: string;
  created_at: string;
  patient_name?: string;
}

interface DoctorReviewPanelProps {
  userRole: string;
}

export const DoctorReviewPanel: React.FC<DoctorReviewPanelProps> = ({ userRole }) => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<DiagnosisSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [doctorNotes, setDoctorNotes] = useState<Record<string, string>>({});
  const [prescriptionData, setPrescriptionData] = useState<Record<string, any>>({});

  // Fetch pending diagnosis sessions
  const fetchPendingSessions = async () => {
    if (userRole !== 'doctor') return;
    
    setLoading(true);
    try {
      // First get diagnosis sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('diagnosis_sessions_v2')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Then get user profiles for each session
      const sessionsWithProfiles = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', session.user_id)
            .single();

          return {
            ...session,
            symptoms: Array.isArray(session.symptoms) 
              ? session.symptoms as string[]
              : typeof session.symptoms === 'string' 
                ? [session.symptoms]
                : [],
            conditions: Array.isArray(session.conditions) 
              ? session.conditions 
              : [],
            patient_name: profile 
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
              : 'Unknown Patient'
          };
        })
      );

      setSessions(sessionsWithProfiles as DiagnosisSession[]);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load pending diagnosis sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSessions();
  }, [userRole]);

  const handleDoctorAction = async (sessionId: string, action: 'approve' | 'modify' | 'reject') => {
    setActionLoading(prev => ({ ...prev, [sessionId]: true }));
    
    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      const requestData: any = {
        doctorNotes: doctorNotes[sessionId] || '',
      };

      // Add prescription data for approve/modify actions
      if ((action === 'approve' || action === 'modify') && prescriptionData[sessionId]) {
        requestData.prescriptionData = prescriptionData[sessionId];
      }

      const response = await fetch(
        `https://zvjasfcntrkfrwvwzlpk.supabase.co/functions/v1/doctor-diagnosis-actions/${sessionId}/${action}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Action failed');
      }

      const result = await response.json();

      toast({
        title: "Action Completed",
        description: `Diagnosis ${action}d successfully`,
      });

      // Refresh sessions list
      fetchPendingSessions();
      
      // Clear form data
      setDoctorNotes(prev => ({ ...prev, [sessionId]: '' }));
      setPrescriptionData(prev => ({ ...prev, [sessionId]: null }));

    } catch (error) {
      console.error('Error performing doctor action:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to perform action",
        variant: "destructive",
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  const addPrescriptionDrug = (sessionId: string) => {
    setPrescriptionData(prev => ({
      ...prev,
      [sessionId]: [
        ...(prev[sessionId] || []),
        {
          name: '',
          dosage: '',
          frequency: '',
          duration: '',
          instructions: ''
        }
      ]
    }));
  };

  const updatePrescriptionDrug = (sessionId: string, drugIndex: number, field: string, value: string) => {
    setPrescriptionData(prev => ({
      ...prev,
      [sessionId]: prev[sessionId]?.map((drug: any, index: number) => 
        index === drugIndex ? { ...drug, [field]: value } : drug
      )
    }));
  };

  const removePrescriptionDrug = (sessionId: string, drugIndex: number) => {
    setPrescriptionData(prev => ({
      ...prev,
      [sessionId]: prev[sessionId]?.filter((_: any, index: number) => index !== drugIndex)
    }));
  };

  if (userRole !== 'doctor') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Stethoscope className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Doctor Review Panel</h2>
        </div>
        <p className="text-muted-foreground">
          Review and approve AI-generated diagnoses awaiting your expert opinion
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading pending diagnoses...</p>
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Reviews</h3>
            <p className="text-muted-foreground">
              All diagnosis sessions have been reviewed. New cases will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-primary/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-primary" />
                      <div>
                        <span className="text-lg">{session.patient_name}</span>
                        <div className="text-sm text-muted-foreground font-normal">
                          Session ID: {session.id.substring(0, 8)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.created_at).toLocaleDateString()}
                      </Badge>
                      <Badge variant="secondary">Pending Review</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Patient Symptoms */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Patient Symptoms
                    </h4>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex flex-wrap gap-2">
                        {session.symptoms?.map((symptom, idx) => (
                          <Badge key={idx} variant="outline">{symptom}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Conditions */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      AI-Generated Conditions
                    </h4>
                    <div className="space-y-3">
                      {session.conditions?.map((condition, idx) => (
                        <div key={idx} className="border rounded-lg p-3 bg-background">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{condition.name || condition.condition}</span>
                            <Badge variant={
                              condition.probability > 0.7 ? 'destructive' : 
                              condition.probability > 0.4 ? 'default' : 'secondary'
                            }>
                              {((condition.probability || 0) * 100).toFixed(1)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {condition.explanation || condition.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Doctor Notes */}
                  <div>
                    <h4 className="font-semibold mb-3">Doctor Notes</h4>
                    <Textarea
                      placeholder="Add your professional assessment, additional observations, or recommendations..."
                      value={doctorNotes[session.id] || ''}
                      onChange={(e) => setDoctorNotes(prev => ({
                        ...prev,
                        [session.id]: e.target.value
                      }))}
                      rows={3}
                    />
                  </div>

                  {/* Prescription Section (for approve/modify) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Pill className="w-4 w-4" />
                        Prescription (Optional)
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addPrescriptionDrug(session.id)}
                      >
                        Add Drug
                      </Button>
                    </div>
                    
                    {prescriptionData[session.id]?.length > 0 && (
                      <div className="space-y-3">
                        {prescriptionData[session.id].map((drug: any, drugIndex: number) => (
                          <div key={drugIndex} className="border rounded-lg p-3 bg-muted/20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-sm font-medium">Drug Name</label>
                                <input
                                  type="text"
                                  placeholder="e.g., Paracetamol"
                                  value={drug.name}
                                  onChange={(e) => updatePrescriptionDrug(session.id, drugIndex, 'name', e.target.value)}
                                  className="w-full mt-1 px-3 py-2 border rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Dosage</label>
                                <input
                                  type="text"
                                  placeholder="e.g., 500mg"
                                  value={drug.dosage}
                                  onChange={(e) => updatePrescriptionDrug(session.id, drugIndex, 'dosage', e.target.value)}
                                  className="w-full mt-1 px-3 py-2 border rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Frequency</label>
                                <input
                                  type="text"
                                  placeholder="e.g., Twice daily"
                                  value={drug.frequency}
                                  onChange={(e) => updatePrescriptionDrug(session.id, drugIndex, 'frequency', e.target.value)}
                                  className="w-full mt-1 px-3 py-2 border rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Duration</label>
                                <input
                                  type="text"
                                  placeholder="e.g., 7 days"
                                  value={drug.duration}
                                  onChange={(e) => updatePrescriptionDrug(session.id, drugIndex, 'duration', e.target.value)}
                                  className="w-full mt-1 px-3 py-2 border rounded text-sm"
                                />
                              </div>
                            </div>
                            <div className="mt-3">
                              <label className="text-sm font-medium">Special Instructions</label>
                              <input
                                type="text"
                                placeholder="e.g., Take with food"
                                value={drug.instructions}
                                onChange={(e) => updatePrescriptionDrug(session.id, drugIndex, 'instructions', e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded text-sm"
                              />
                            </div>
                            <div className="mt-2 flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removePrescriptionDrug(session.id, drugIndex)}
                                className="text-destructive hover:text-destructive"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t">
                    <Button
                      onClick={() => handleDoctorAction(session.id, 'approve')}
                      disabled={actionLoading[session.id]}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {actionLoading[session.id] ? 'Processing...' : 'Approve'}
                    </Button>
                    
                    <Button
                      onClick={() => handleDoctorAction(session.id, 'modify')}
                      disabled={actionLoading[session.id]}
                      variant="outline"
                      className="flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      <Edit3 className="w-4 h-4" />
                      {actionLoading[session.id] ? 'Processing...' : 'Modify'}
                    </Button>
                    
                    <Button
                      onClick={() => handleDoctorAction(session.id, 'reject')}
                      disabled={actionLoading[session.id]}
                      variant="outline"
                      className="flex items-center gap-2 border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4" />
                      {actionLoading[session.id] ? 'Processing...' : 'Reject'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};