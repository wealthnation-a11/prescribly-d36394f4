import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, QrCode, CheckCircle, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const RegistrationCodeVerification = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['admin-registration-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registration_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      const withDetails = await Promise.all(
        data.map(async (code) => {
          const [patientRes, facilityRes] = await Promise.all([
            supabase.from('profiles').select('first_name, last_name').eq('user_id', code.patient_id).single(),
            supabase.from('facilities').select('name, type').eq('id', code.facility_id).single(),
          ]);
          return { ...code, patient: patientRes.data, facility: facilityRes.data };
        })
      );
      return withDetails;
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('registration_codes')
        .update({ status: 'used', confirmed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Code confirmed as used' });
      queryClient.invalidateQueries({ queryKey: ['admin-registration-codes'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to confirm code.', variant: 'destructive' });
    },
  });

  const filtered = codes.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.patient?.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.patient?.last_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.facility?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (code: any) => {
    if (code.status === 'used') return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Used</Badge>;
    const expired = new Date(code.expires_at) < new Date();
    if (expired) return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
    return <Badge className="bg-orange-100 text-orange-800 border-orange-200"><Clock className="w-3 h-3 mr-1" />Active</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by code, patient name, or facility..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{codes.length}</p>
            <p className="text-xs text-muted-foreground">Total Codes</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{codes.filter(c => c.status === 'used').length}</p>
            <p className="text-xs text-muted-foreground">Used</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{codes.filter(c => c.status !== 'used' && new Date(c.expires_at) >= new Date()).length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">No registration codes found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(code => (
            <Card key={code.id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono text-sm font-bold bg-muted px-2 py-0.5 rounded">{code.code}</code>
                      {getStatusBadge(code)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 mt-1 text-sm text-muted-foreground">
                      <span>Patient: <span className="font-medium text-foreground">{code.patient?.first_name} {code.patient?.last_name}</span></span>
                      <span>Facility: <span className="font-medium text-foreground">{code.facility?.name || 'N/A'}</span></span>
                      <span>Expires: {format(new Date(code.expires_at), 'PPP p')}</span>
                      {code.confirmed_at && <span>Confirmed: {format(new Date(code.confirmed_at), 'PPP p')}</span>}
                    </div>
                  </div>
                  {code.status !== 'used' && new Date(code.expires_at) >= new Date() && (
                    <Button size="sm" onClick={() => confirmMutation.mutate(code.id)} disabled={confirmMutation.isPending}>
                      <CheckCircle className="w-4 h-4 mr-1" />Confirm
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RegistrationCodeVerification;
