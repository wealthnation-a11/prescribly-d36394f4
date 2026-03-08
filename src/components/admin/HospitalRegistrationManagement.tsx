import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Building2, MapPin } from 'lucide-react';

interface HospitalRegistration {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  contact_person: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const HospitalRegistrationManagement = () => {
  const [selected, setSelected] = useState<HospitalRegistration | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: registrations, isLoading } = useQuery({
    queryKey: ['hospital-registrations', activeTab],
    queryFn: async () => {
      let query = supabase.from('hospital_registrations').select('*').order('created_at', { ascending: false });
      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as HospitalRegistration[];
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: string; action: 'approve' | 'reject'; notes?: string }) => {
      const reg = registrations?.find(r => r.id === id);
      if (!reg) throw new Error('Registration not found');

      // Update status
      const { error: updateError } = await supabase
        .from('hospital_registrations')
        .update({ status: action === 'approve' ? 'approved' : 'rejected', admin_notes: notes || null } as any)
        .eq('id', id);
      if (updateError) throw updateError;

      // If approved, add to facilities
      if (action === 'approve') {
        const { error: facilityError } = await supabase.from('facilities').insert({
          name: reg.name,
          type: reg.type,
          address: reg.address,
          city: reg.city,
          state: reg.state,
          country: reg.country,
          phone: reg.phone,
          email: reg.email,
          description: reg.description,
          latitude: reg.latitude,
          longitude: reg.longitude,
          is_active: true,
        });
        if (facilityError) throw facilityError;
      }
    },
    onSuccess: (_, variables) => {
      toast({ title: 'Success', description: `Hospital ${variables.action === 'approve' ? 'approved and added to facilities' : 'rejected'}.` });
      queryClient.invalidateQueries({ queryKey: ['hospital-registrations'] });
      setSelected(null);
      setActionType(null);
      setNotes('');
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const pendingCount = registrations?.filter(r => r.status === 'pending').length || 0;

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto gap-1 p-1">
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            <Clock className="w-3.5 h-3.5 mr-1" />Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs sm:text-sm">
            <CheckCircle className="w-3.5 h-3.5 mr-1" />Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs sm:text-sm">
            <XCircle className="w-3.5 h-3.5 mr-1" />Rejected
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : !registrations?.length ? (
            <p className="text-center text-muted-foreground py-8">No hospital registrations found</p>
          ) : (
            <>
              {/* Mobile */}
              <div className="block md:hidden space-y-3">
                {registrations.map((reg) => (
                  <Card key={reg.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{reg.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{reg.type}</p>
                        </div>
                        {getStatusBadge(reg.status)}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{reg.city}, {reg.country}</div>
                        <div>{reg.contact_person} • {reg.email}</div>
                      </div>
                      {reg.status === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => { setSelected(reg); setActionType('approve'); }}>
                            <CheckCircle className="w-4 h-4 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setSelected(reg); setActionType('reject'); }}>
                            <XCircle className="w-4 h-4 mr-1" />Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-medium">{reg.name}</TableCell>
                        <TableCell className="capitalize">{reg.type}</TableCell>
                        <TableCell>{reg.city}, {reg.country}</TableCell>
                        <TableCell>
                          <div className="text-sm">{reg.contact_person}</div>
                          <div className="text-xs text-muted-foreground">{reg.email}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(reg.status)}</TableCell>
                        <TableCell>{new Date(reg.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          {reg.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { setSelected(reg); setActionType('approve'); }}>
                                <CheckCircle className="w-4 h-4 mr-1" />Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => { setSelected(reg); setActionType('reject'); }}>
                                <XCircle className="w-4 h-4 mr-1" />Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected && !!actionType} onOpenChange={() => { setSelected(null); setActionType(null); setNotes(''); }}>
        <DialogContent className="max-w-[90vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{actionType === 'approve' ? 'Approve' : 'Reject'} Hospital Registration</DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? `Approving "${selected?.name}" will add it to the facilities directory and make it visible on the map.`
                : `Are you sure you want to reject "${selected?.name}"?`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{actionType === 'reject' ? 'Reason for rejection' : 'Notes'} (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={actionType === 'reject' ? 'Reason...' : 'Any notes...'} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setSelected(null); setActionType(null); setNotes(''); }}>Cancel</Button>
            <Button
              className={`w-full sm:w-auto ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
              disabled={actionMutation.isPending}
              onClick={() => selected && actionType && actionMutation.mutate({ id: selected.id, action: actionType, notes: notes.trim() || undefined })}
            >
              {actionMutation.isPending ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" /> : null}
              {actionType === 'approve' ? 'Approve & Add to Facilities' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HospitalRegistrationManagement;
