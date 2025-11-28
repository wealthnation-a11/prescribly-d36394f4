import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, Leaf, MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileHeader } from '@/components/MobileHeader';

export default function UserHerbalConsultations() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: consultations, isLoading } = useQuery({
    queryKey: ['user-herbal-consultations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('herbal_consultations')
        .select(`
          *,
          herbal_practitioners(
            first_name,
            last_name,
            specialization
          )
        `)
        .eq('patient_id', user.id)
        .order('scheduled_time', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive', label: string }> = {
      completed: { variant: 'default', label: 'Completed' },
      approved: { variant: 'default', label: 'Approved' },
      pending: { variant: 'secondary', label: 'Pending Approval' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };
    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <MobileHeader title="My Consultations" />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Herbal Consultations</h1>
                <p className="text-sm sm:text-base text-muted-foreground">View your scheduled and past consultations with herbal practitioners</p>
              </div>

        <div className="grid gap-3 sm:gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-sm">Loading consultations...</CardContent>
            </Card>
          ) : consultations?.length === 0 ? (
            <Card>
              <CardContent className="p-6 sm:p-8 text-center">
                <Leaf className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                <p className="text-sm sm:text-base text-muted-foreground">No consultations booked yet</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  Visit the <a href="/herbal-medicine" className="text-primary hover:underline">Herbal Medicine</a> section to find practitioners
                </p>
              </CardContent>
            </Card>
          ) : (
            consultations?.map((consultation: any) => (
              <Card key={consultation.id}>
                <CardHeader className="px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span className="truncate">
                        {consultation.herbal_practitioners?.first_name} {consultation.herbal_practitioners?.last_name}
                      </span>
                    </CardTitle>
                    {getStatusBadge(consultation.status)}
                  </div>
                  {consultation.herbal_practitioners?.specialization && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {consultation.herbal_practitioners.specialization}
                    </p>
                  )}
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
                      <strong className="text-xs sm:text-sm">Your Notes:</strong>
                      <p className="text-xs sm:text-sm mt-1 break-words">{consultation.notes}</p>
                    </div>
                  )}
                  {consultation.status === 'pending' && (
                    <div className="mt-3 sm:mt-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                        <strong>⏳ Waiting for practitioner approval</strong>
                        <br />
                        You'll be able to message them once they approve your consultation request.
                      </p>
                    </div>
                  )}
                  {consultation.status === 'approved' && (
                    <div className="mt-3 sm:mt-4">
                      <Button
                        onClick={() => navigate('/herbal/patient-messages', { state: { practitionerId: consultation.practitioner_id } })}
                        className="w-full sm:w-auto gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Message Practitioner
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
