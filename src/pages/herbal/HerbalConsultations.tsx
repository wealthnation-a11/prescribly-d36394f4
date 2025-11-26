import { HerbalPractitionerLayout } from '@/components/HerbalPractitionerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHerbalPractitioner } from '@/hooks/useHerbalPractitioner';

export default function HerbalConsultations() {
  const { practitioner } = useHerbalPractitioner();

  const { data: consultations, isLoading } = useQuery({
    queryKey: ['herbal-consultations', practitioner?.id],
    queryFn: async () => {
      if (!practitioner?.id) return [];
      const { data, error } = await supabase
        .from('herbal_consultations')
        .select('*, profiles(first_name, last_name)')
        .eq('practitioner_id', practitioner.id)
        .order('scheduled_time', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!practitioner?.id,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      completed: 'default',
      scheduled: 'secondary',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <HerbalPractitionerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consultations</h1>
          <p className="text-muted-foreground">Manage your patient consultations</p>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">Loading consultations...</CardContent>
            </Card>
          ) : consultations?.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No consultations scheduled yet</p>
              </CardContent>
            </Card>
          ) : (
            consultations?.map((consultation: any) => (
              <Card key={consultation.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {consultation.profiles?.first_name} {consultation.profiles?.last_name}
                    </CardTitle>
                    {getStatusBadge(consultation.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {new Date(consultation.scheduled_time).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {new Date(consultation.scheduled_time).toLocaleTimeString()}
                    {consultation.duration_minutes && ` (${consultation.duration_minutes} min)`}
                  </div>
                  {consultation.consultation_fee && (
                    <div className="text-sm">
                      <strong>Fee:</strong> ${consultation.consultation_fee.toFixed(2)}
                    </div>
                  )}
                  {consultation.notes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <strong className="text-sm">Notes:</strong>
                      <p className="text-sm mt-1">{consultation.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </HerbalPractitionerLayout>
  );
}
