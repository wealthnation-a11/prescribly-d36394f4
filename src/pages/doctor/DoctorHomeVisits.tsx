import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Clock, MapPin, User, CheckCircle, X, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DoctorLayout } from "@/components/DoctorLayout";

const DoctorHomeVisits = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['doctor-home-visits', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      const { data, error } = await supabase
        .from('home_visit_requests')
        .select('*')
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const withPatients = await Promise.all(
        data.map(async (req) => {
          const { data: patient } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url, phone')
            .eq('user_id', req.patient_id)
            .single();
          return { ...req, patient };
        })
      );
      return withPatients;
    },
    enabled: !!user?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('home_visit_requests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;

      // Find the request to notify the patient
      const request = requests.find(r => r.id === id);
      if (request) {
        await supabase.from('notifications').insert({
          user_id: request.patient_id,
          type: status === 'accepted' ? 'home_visit_accepted' : 'home_visit_rejected',
          title: status === 'accepted' ? 'Home Visit Accepted' : 'Home Visit Declined',
          message: status === 'accepted'
            ? 'Your home visit request has been accepted. The doctor will arrive at your location.'
            : 'Your home visit request has been declined. Please try another doctor.',
          data: { request_id: id },
        });
      }
    },
    onSuccess: (_, { status }) => {
      toast({
        title: status === 'accepted' ? 'Request accepted' : 'Request declined',
        description: 'The patient has been notified.',
      });
      queryClient.invalidateQueries({ queryKey: ['doctor-home-visits'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update request.', variant: 'destructive' });
    },
  });

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_transit': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <DoctorLayout title="Home Visit Requests" subtitle={`Manage patient home visit requests${pendingCount > 0 ? ` • ${pendingCount} pending` : ''}`}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: requests.length, color: 'bg-primary/10 text-primary' },
            { label: 'Pending', value: pendingCount, color: 'bg-orange-100 text-orange-700' },
            { label: 'Accepted', value: requests.filter(r => r.status === 'accepted').length, color: 'bg-green-100 text-green-700' },
            { label: 'Completed', value: requests.filter(r => r.status === 'completed').length, color: 'bg-blue-100 text-blue-700' },
          ].map(s => (
            <Card key={s.label} className="shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Home className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No home visit requests</h3>
              <p className="text-muted-foreground">When patients request home visits, they'll appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <Card key={req.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Patient Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {req.patient?.first_name || 'Unknown'} {req.patient?.last_name || 'Patient'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {req.age} years • {req.gender}
                          </p>
                        </div>
                        <Badge className={`${getStatusColor(req.status || 'pending')} border ml-auto lg:ml-2`}>
                          {req.status || 'pending'}
                        </Badge>
                        <Badge className={`${getUrgencyColor(req.urgency_level)} border`}>
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {req.urgency_level} urgency
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="text-muted-foreground">Illness Duration:</span>{' '}
                            <span className="font-medium">{req.illness_duration}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="text-muted-foreground">Address:</span>{' '}
                            <span className="font-medium">{req.address}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm font-medium mb-1">Symptoms:</p>
                        <p className="text-sm text-muted-foreground">{req.symptoms}</p>
                      </div>

                      {req.image_url && (
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <ImageIcon className="w-4 h-4" />
                          <a href={req.image_url} target="_blank" rel="noopener noreferrer" className="underline">
                            View attached image
                          </a>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Submitted {req.created_at ? format(new Date(req.created_at), 'PPP p') : 'N/A'}
                        {req.consultation_fee && ` • Fee: ₦${req.consultation_fee.toLocaleString()}`}
                      </p>
                    </div>

                    {/* Actions */}
                    {req.status === 'pending' && (
                      <div className="flex lg:flex-col gap-2 flex-shrink-0">
                        <Button
                          onClick={() => updateStatusMutation.mutate({ id: req.id, status: 'accepted' })}
                          disabled={updateStatusMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => updateStatusMutation.mutate({ id: req.id, status: 'rejected' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    )}
                    {req.status === 'accepted' && (
                      <div className="flex lg:flex-col gap-2 flex-shrink-0">
                        <Button
                          onClick={() => updateStatusMutation.mutate({ id: req.id, status: 'in_transit' })}
                          disabled={updateStatusMutation.isPending}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          On My Way
                        </Button>
                        <Button
                          onClick={() => updateStatusMutation.mutate({ id: req.id, status: 'completed' })}
                          disabled={updateStatusMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DoctorLayout>
  );
};

export default DoctorHomeVisits;
