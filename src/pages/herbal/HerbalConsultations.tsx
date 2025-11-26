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
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Consultations</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your patient consultations</p>
        </div>

        <div className="grid gap-3 sm:gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-sm">Loading consultations...</CardContent>
            </Card>
          ) : consultations?.length === 0 ? (
            <Card>
              <CardContent className="p-6 sm:p-8 text-center">
                <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                <p className="text-sm sm:text-base text-muted-foreground">No consultations scheduled yet</p>
              </CardContent>
            </Card>
          ) : (
            consultations?.map((consultation: any) => (
              <Card key={consultation.id}>
                <CardHeader className="px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="truncate">{consultation.profiles?.first_name} {consultation.profiles?.last_name}</span>
                    </CardTitle>
                    {getStatusBadge(consultation.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 px-4 sm:px-6">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    {new Date(consultation.scheduled_time).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    {new Date(consultation.scheduled_time).toLocaleTimeString()}
                    {consultation.duration_minutes && ` (${consultation.duration_minutes} min)`}
                  </div>
                  {consultation.consultation_fee && (
                    <div className="text-xs sm:text-sm">
                      <strong>Fee:</strong> ${consultation.consultation_fee.toFixed(2)}
                    </div>
                  )}
                  {consultation.notes && (
                    <div className="mt-3 sm:mt-4 p-3 bg-muted rounded-lg">
                      <strong className="text-xs sm:text-sm">Notes:</strong>
                      <p className="text-xs sm:text-sm mt-1 break-words">{consultation.notes}</p>
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
