import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Pill, User, Loader2, Clock, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { DoctorLayout } from '@/components/DoctorLayout';

interface PendingApproval {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  diagnosis_session_id: string;
  condition_name: string;
  condition_id: number | null;
  drugs: any[];
  approved_drugs: any[] | null;
  status: string;
  doctor_notes: string | null;
  created_at: string;
  patient?: { first_name: string; last_name: string };
}

export const PendingPrescriptionReview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingApprovals = [], isLoading } = useQuery({
    queryKey: ['pending-drug-approvals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('pending_drug_approvals')
        .select('*')
        .in('status', ['pending', 'under_review'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch patient profiles
      const withPatients = await Promise.all(
        (data || []).map(async (approval: any) => {
          const { data: patient } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', approval.patient_id)
            .single();
          return { ...approval, patient } as PendingApproval;
        })
      );

      return withPatients;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <DoctorLayout title="Pending Prescriptions" subtitle="Review AI-recommended medications for patients">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout title="Pending Prescriptions" subtitle="Review and approve AI-recommended medications for patients">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-orange-500" />
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pendingApprovals.length}</p>
              <p className="text-sm text-muted-foreground">prescriptions awaiting review</p>
            </CardContent>
          </Card>
        </div>

        {pendingApprovals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground">No pending prescriptions to review.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingApprovals.map((approval) => (
              <PrescriptionReviewCard key={approval.id} approval={approval} />
            ))}
          </div>
        )}
      </div>
    </DoctorLayout>
  );
};

const PrescriptionReviewCard: React.FC<{ approval: PendingApproval }> = ({ approval }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [selectedDrugs, setSelectedDrugs] = useState<Set<number>>(
    new Set(approval.drugs.map((_: any, i: number) => i))
  );

  const updateMutation = useMutation({
    mutationFn: async ({ status, approvedDrugs }: { status: string; approvedDrugs?: any[] }) => {
      const updateData: any = {
        status,
        doctor_id: user?.id,
        doctor_notes: notes || null,
      };
      if (approvedDrugs) {
        updateData.approved_drugs = approvedDrugs;
      }

      const { error } = await supabase
        .from('pending_drug_approvals')
        .update(updateData)
        .eq('id', approval.id);

      if (error) throw error;

      // Create notification for the patient
      await supabase.functions.invoke('create-notification', {
        body: {
          user_id: approval.patient_id,
          type: status === 'approved' ? 'prescription_approved' : 'prescription_rejected',
          title: status === 'approved' ? 'Prescription Approved' : 'Prescription Update',
          message: status === 'approved'
            ? `A doctor has approved your medication recommendations for ${approval.condition_name}.`
            : `A doctor has reviewed your medication recommendations for ${approval.condition_name}. Please check the details.`,
          data: { approval_id: approval.id, condition_name: approval.condition_name },
          diagnosis_session_id: approval.diagnosis_session_id,
        }
      });
    },
    onSuccess: (_, { status }) => {
      toast({
        title: status === 'approved' ? 'Prescription Approved' : 'Prescription Rejected',
        description: `The patient has been notified.`,
      });
      queryClient.invalidateQueries({ queryKey: ['pending-drug-approvals'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update prescription.',
        variant: 'destructive',
      });
    },
  });

  const handleApprove = () => {
    const approvedDrugs = approval.drugs.filter((_: any, i: number) => selectedDrugs.has(i));
    if (approvedDrugs.length === 0) {
      toast({ title: 'Select at least one drug', variant: 'destructive' });
      return;
    }
    updateMutation.mutate({ status: 'approved', approvedDrugs });
  };

  const handleReject = () => {
    if (!notes.trim()) {
      toast({ title: 'Please add notes explaining the rejection', variant: 'destructive' });
      return;
    }
    updateMutation.mutate({ status: 'rejected' });
  };

  const toggleDrug = (index: number) => {
    setSelectedDrugs(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            {approval.condition_name}
          </CardTitle>
          <Badge variant="outline" className="bg-orange-100 text-orange-800">
            {approval.status === 'under_review' ? 'Under Review' : 'Pending'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          Patient: {approval.patient?.first_name} {approval.patient?.last_name}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Pill className="h-4 w-4" />
          <AlertDescription>
            AI-recommended medications below. Select which ones to approve.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {approval.drugs.map((drug: any, index: number) => (
            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
              <Checkbox
                checked={selectedDrugs.has(index)}
                onCheckedChange={() => toggleDrug(index)}
                className="mt-1"
              />
              <div className="flex-1">
                <h4 className="font-semibold">{drug.drug_name}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-1 text-sm text-muted-foreground">
                  {drug.strength && <span>Strength: {drug.strength}</span>}
                  {drug.form && <span>Form: {drug.form}</span>}
                  {drug.dosage && <span>Dosage: {drug.dosage}</span>}
                </div>
                {drug.notes && <p className="text-sm text-muted-foreground italic mt-1">{drug.notes}</p>}
              </div>
            </div>
          ))}
        </div>

        <div>
          <Label htmlFor={`notes-${approval.id}`}>Doctor's Notes (optional for approval, required for rejection)</Label>
          <Textarea
            id={`notes-${approval.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about your decision..."
            className="mt-1"
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleApprove}
            disabled={updateMutation.isPending}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Approve Selected ({selectedDrugs.size})
          </Button>
          <Button
            onClick={handleReject}
            disabled={updateMutation.isPending}
            variant="destructive"
            className="flex-1"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingPrescriptionReview;
