import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HerbalRemedy {
  id: string;
  name: string;
  description: string;
  price: number;
  approval_status: string;
  created_at: string;
  practitioner_id: string;
  ingredients: any;
  usage_instructions: string;
  herbal_practitioners: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export const HerbalRemediesModeration = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRemedy, setSelectedRemedy] = useState<HerbalRemedy | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: remedies, isLoading } = useQuery({
    queryKey: ['herbal-remedies-moderation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('herbal_remedies')
        .select(`
          *,
          herbal_practitioners (
            first_name,
            last_name,
            email
          )
        `)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as HerbalRemedy[];
    },
  });

  const updateRemedyMutation = useMutation({
    mutationFn: async ({ remedyId, status, notes }: { remedyId: string; status: string; notes: string }) => {
      const updateData: any = {
        approval_status: status,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      };

      if (status === 'rejected') {
        updateData.rejection_reason = notes;
      }

      const { error: updateError } = await supabase
        .from('herbal_remedies')
        .update(updateData)
        .eq('id', remedyId);

      if (updateError) throw updateError;

      // Create audit log
      const { error: auditError } = await supabase
        .from('herbal_remedy_audit')
        .insert({
          remedy_id: remedyId,
          admin_id: user?.id,
          action: status,
          notes: notes,
        });

      if (auditError) throw auditError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['herbal-remedies-moderation'] });
      toast.success('Remedy status updated successfully');
      setSelectedRemedy(null);
      setActionType(null);
      setNotes('');
    },
    onError: (error) => {
      toast.error('Failed to update remedy status');
      console.error(error);
    },
  });

  const handleAction = (remedy: HerbalRemedy, action: 'approve' | 'reject') => {
    setSelectedRemedy(remedy);
    setActionType(action);
  };

  const handleConfirm = () => {
    if (!selectedRemedy || !actionType) return;
    updateRemedyMutation.mutate({
      remedyId: selectedRemedy.id,
      status: actionType === 'approve' ? 'approved' : 'rejected',
      notes,
    });
  };

  const handleViewDetails = (remedy: HerbalRemedy) => {
    setSelectedRemedy(remedy);
    setShowDetailsDialog(true);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Herbal Remedies</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Remedy Name</TableHead>
              <TableHead>Practitioner</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {remedies?.map((remedy) => (
              <TableRow key={remedy.id}>
                <TableCell className="font-medium">{remedy.name}</TableCell>
                <TableCell>
                  {remedy.herbal_practitioners.first_name} {remedy.herbal_practitioners.last_name}
                </TableCell>
                <TableCell>₦{remedy.price}</TableCell>
                <TableCell>{new Date(remedy.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewDetails(remedy)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="default" onClick={() => handleAction(remedy, 'approve')}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleAction(remedy, 'reject')}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Action Dialog */}
        <Dialog open={!!actionType} onOpenChange={() => { setActionType(null); setNotes(''); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Approve' : 'Reject'} Remedy
              </DialogTitle>
              <DialogDescription>
                {actionType === 'approve' 
                  ? 'Are you sure you want to approve this remedy?' 
                  : 'Please provide a reason for rejection:'}
              </DialogDescription>
            </DialogHeader>
            {actionType === 'reject' && (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
              />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setActionType(null); setNotes(''); }}>
                Cancel
              </Button>
              <Button onClick={handleConfirm}>
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedRemedy?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedRemedy?.description}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Usage Instructions</h4>
                <p className="text-sm text-muted-foreground">{selectedRemedy?.usage_instructions}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Ingredients</h4>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(selectedRemedy?.ingredients) && selectedRemedy?.ingredients.map((ingredient: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{ingredient}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
