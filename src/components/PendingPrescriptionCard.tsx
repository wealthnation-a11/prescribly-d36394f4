import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, CheckCircle, XCircle, Pill, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface PendingPrescriptionCardProps {
  sessionId: string;
  conditionName: string;
  drugs: any[];
}

export const PendingPrescriptionCard: React.FC<PendingPrescriptionCardProps> = ({
  sessionId,
  conditionName,
  drugs
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('pending');
  const [approvedDrugs, setApprovedDrugs] = useState<any[] | null>(null);
  const [doctorNotes, setDoctorNotes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('pending_drug_approvals')
        .select('status, approved_drugs, doctor_notes')
        .eq('patient_id', user.id)
        .eq('diagnosis_session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        setStatus(data[0].status);
        setApprovedDrugs(data[0].approved_drugs as any[] | null);
        setDoctorNotes(data[0].doctor_notes);
      }
      setLoading(false);
    };

    fetchStatus();

    // Real-time subscription for status changes
    const channel = supabase
      .channel(`pending-approval-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pending_drug_approvals',
          filter: `diagnosis_session_id=eq.${sessionId}`
        },
        (payload) => {
          const updated = payload.new as any;
          setStatus(updated.status);
          setApprovedDrugs(updated.approved_drugs);
          setDoctorNotes(updated.doctor_notes);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, sessionId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (status === 'approved' && approvedDrugs) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            Doctor-Approved Medications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {doctorNotes && (
            <Alert>
              <AlertDescription>
                <strong>Doctor's Notes:</strong> {doctorNotes}
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-3">
            {approvedDrugs.map((drug: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg bg-background">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-lg">{drug.drug_name}</h4>
                  <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mb-2">
                  {drug.strength && <div><span className="font-medium">Strength:</span> {drug.strength}</div>}
                  {drug.form && <div><span className="font-medium">Form:</span> {drug.form}</div>}
                  {drug.dosage && <div><span className="font-medium">Dosage:</span> {drug.dosage}</div>}
                </div>
                {drug.notes && <p className="text-sm text-muted-foreground italic">{drug.notes}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'rejected') {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Prescription Not Approved
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {doctorNotes && (
            <Alert>
              <AlertDescription>
                <strong>Doctor's Notes:</strong> {doctorNotes}
              </AlertDescription>
            </Alert>
          )}
          <p className="text-muted-foreground">
            The doctor has reviewed the AI recommendations and determined they are not suitable. 
            Please book a consultation for personalized treatment.
          </p>
          <Button onClick={() => navigate('/book-appointment')} variant="default">
            <Calendar className="h-4 w-4 mr-2" />
            Book Consultation
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Pending or under_review
  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <Clock className="h-5 w-5" />
          Medications Pending Doctor Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Pill className="h-4 w-4" />
          <AlertDescription>
            Your AI diagnosis identified potential medications for <strong>{conditionName}</strong>. 
            A doctor needs to review and approve these recommendations before they can be shown to you.
          </AlertDescription>
        </Alert>
        
        <p className="text-sm text-muted-foreground">
          {status === 'under_review' 
            ? 'A doctor is currently reviewing your prescription recommendations.'
            : 'Waiting for a doctor to pick up and review your prescription recommendations.'}
        </p>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-orange-100 text-orange-800">
            {status === 'under_review' ? 'Under Review' : 'Pending'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {drugs.length} medication{drugs.length !== 1 ? 's' : ''} awaiting review
          </span>
        </div>

        <Button onClick={() => navigate('/book-appointment')} variant="outline" className="w-full">
          <Calendar className="h-4 w-4 mr-2" />
          Book a Doctor to Review Faster
        </Button>
      </CardContent>
    </Card>
  );
};
