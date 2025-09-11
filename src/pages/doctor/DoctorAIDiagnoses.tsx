import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { DoctorLayout } from "@/components/DoctorLayout";
import { Brain, User, Calendar, FileText, AlertCircle, CheckCircle, XCircle, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DiagnosisSession {
  id: string;
  patient_id: string;
  symptoms_text: string | null;
  selected_symptoms: any;
  ai_diagnoses: any;
  suggested_drugs: any;
  doctor_review_status: string;
  doctor_id?: string | null;
  doctor_notes?: string | null;
  created_at: string;
  patient_name?: string;
}

export default function DoctorAIDiagnoses() {
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<DiagnosisSession | null>(null);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch pending diagnosis sessions
  const { data: sessions = [], refetch } = useQuery({
    queryKey: ['ai-diagnoses-pending'],
    queryFn: async () => {
      // First get the sessions
      const { data: sessionsData, error } = await supabase
        .from('diagnosis_sessions')
        .select('*')
        .eq('doctor_review_status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Sessions query error:', error);
        throw error;
      }

      // Then get patient names
      const sessionsWithNames = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', session.patient_id)
            .single();
          
          return {
            ...session,
            patient_name: profile 
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Patient'
              : 'Unknown Patient'
          };
        })
      );

      return sessionsWithNames;
    },
  });

  const handleReviewAction = async (sessionId: string, action: 'approved' | 'modified' | 'rejected') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('diagnosis_sessions')
        .update({
          doctor_review_status: action,
          doctor_notes: doctorNotes,
          doctor_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', sessionId);

      if (error) throw error;

      // If approved or modified, create prescription
      if (action === 'approved' || action === 'modified') {
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
          const { error: prescriptionError } = await supabase
            .from('prescriptions')
            .insert({
              doctor_id: (await supabase.auth.getUser()).data.user?.id,
              patient_id: session.patient_id,
              diagnosis: Array.isArray(session.ai_diagnoses) 
                ? session.ai_diagnoses.map((d: any) => d.name).join(', ')
                : 'AI Assessment',
              medications: session.suggested_drugs,
              instructions: doctorNotes || 'Follow prescribed medications as directed.',
            });

          if (prescriptionError) {
            console.error('Prescription creation error:', prescriptionError);
          }
        }
      }

      toast({
        title: "Review Complete",
        description: `Diagnosis ${action} successfully.`,
      });

      setSelectedSession(null);
      setDoctorNotes("");
      refetch();
    } catch (error) {
      console.error('Review error:', error);
      toast({
        title: "Error",
        description: "Failed to process review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openSessionDetails = (session: DiagnosisSession) => {
    setSelectedSession(session);
    setDoctorNotes(session.doctor_notes || "");
  };

  return (
    <DoctorLayout title="AI-Assisted Diagnoses" subtitle="Review and approve AI-generated diagnoses">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Brain className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{sessions.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Approved Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Total Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle>Pending AI Diagnoses</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No pending diagnoses</p>
                <p className="text-sm text-muted-foreground">All AI-assisted diagnoses have been reviewed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{session.patient_name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">Pending Review</Badge>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-muted-foreground mb-1">Symptoms:</p>
                      <p className="text-sm">{session.symptoms_text || "No symptoms described"}</p>
                    </div>

                    {Array.isArray(session.ai_diagnoses) && session.ai_diagnoses.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-muted-foreground mb-1">Top AI Diagnoses:</p>
                        <div className="flex gap-2 flex-wrap">
                          {session.ai_diagnoses.slice(0, 3).map((diagnosis: any, index: number) => (
                            <Badge key={index} variant="secondary">
                              {diagnosis.name} ({((diagnosis.probability || 0) * 100).toFixed(0)}%)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => openSessionDetails(session)}
                      className="w-full"
                    >
                      Review Case
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session Details Modal */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Case Review: {selectedSession?.patient_name}
            </DialogTitle>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-6">
              {/* Patient Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Patient Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Name:</strong> {selectedSession.patient_name}</p>
                      <p><strong>Assessment Date:</strong> {new Date(selectedSession.created_at).toLocaleDateString()}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Symptoms Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedSession.symptoms_text || "No description provided"}</p>
                  </CardContent>
                </Card>
              </div>

              {/* AI Diagnoses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">AI Assessment Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.isArray(selectedSession.ai_diagnoses) && selectedSession.ai_diagnoses.length > 0 ? (
                    <div className="space-y-3">
                      {selectedSession.ai_diagnoses.map((diagnosis: any, index: number) => (
                        <div key={index} className="border rounded p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{diagnosis.name || 'Unknown Condition'}</h4>
                            <Badge variant="outline">
                              {((diagnosis.probability || 0) * 100).toFixed(1)}% confidence
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{diagnosis.description || 'No description available'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No AI diagnoses available</p>
                  )}
                </CardContent>
              </Card>

              {/* Drug Recommendations */}
              {Array.isArray(selectedSession.suggested_drugs) && selectedSession.suggested_drugs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Suggested Medications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedSession.suggested_drugs.map((drug: any, index: number) => (
                        <div key={index} className="border rounded p-3">
                          <h4 className="font-medium">{drug.drug_name || 'Unknown Medication'}</h4>
                          <p className="text-sm text-muted-foreground">Dosage: {drug.dosage || 'Not specified'}</p>
                          {drug.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{drug.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Doctor Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Doctor Notes & Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Add your professional notes, modifications, or additional instructions..."
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => handleReviewAction(selectedSession.id, 'approved')}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                
                <Button
                  onClick={() => handleReviewAction(selectedSession.id, 'modified')}
                  disabled={loading}
                  className="flex-1"
                  variant="outline"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modify & Approve
                </Button>
                
                <Button
                  onClick={() => handleReviewAction(selectedSession.id, 'rejected')}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DoctorLayout>
  );
}