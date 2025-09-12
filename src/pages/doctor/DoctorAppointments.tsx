import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, CheckCircle, User, CalendarDays, X, Video } from "lucide-react";
import { DoctorAppointmentCard } from "@/components/DoctorAppointmentCard";
import { useAuth } from "@/contexts/AuthContext";
import { useEnhancedActivityLogger } from "@/hooks/useEnhancedActivityLogger";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DoctorLayout } from "@/components/DoctorLayout";

export const DoctorAppointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logAppointmentApproved, logAppointmentCompleted, logAppointmentRejected } = useEnhancedActivityLogger();

  // Fetch today's appointments for the doctor
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['doctor-appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          doctor_id,
          scheduled_time,
          duration_minutes,
          status,
          consultation_fee,
          notes,
          consultation_log,
          created_at,
          updated_at
        `)
        .eq('doctor_id', user.id)
        .gte('scheduled_time', startOfDay.toISOString())
        .lte('scheduled_time', endOfDay.toISOString())
        .order('scheduled_time', { ascending: true });
      
      if (error) throw error;
      
      // Fetch patient details separately
      const appointmentsWithPatients = await Promise.all(
        data.map(async (appointment) => {
          const { data: patient } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', appointment.patient_id)
            .single();
          
          return {
            ...appointment,
            patient
          };
        })
      );
      
      return appointmentsWithPatients;
    },
    enabled: !!user?.id,
  });

  // Mark appointment as completed
  const markCompletedMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId);
      
      if (error) throw error;
    },
    onSuccess: (_, appointmentId) => {
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (appointment?.patient) {
        logAppointmentCompleted(
          `${appointment.patient.first_name} ${appointment.patient.last_name}`,
          format(new Date(appointment.scheduled_time), 'PPP'),
          appointmentId
        );
      }
      
      toast({
        title: "Appointment marked as completed",
        description: "The appointment status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update appointment status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Approve appointment
  const approveAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'approved' })
        .eq('id', appointmentId);
      
      if (error) throw error;
    },
    onSuccess: (_, appointmentId) => {
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (appointment?.patient) {
        logAppointmentApproved(
          `${appointment.patient.first_name} ${appointment.patient.last_name}`,
          format(new Date(appointment.scheduled_time), 'PPP'),
          appointmentId
        );
      }
      
      toast({
        title: "Appointment approved",
        description: "The patient can now start chatting with you.",
      });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Decline appointment
  const declineAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);
      
      if (error) throw error;
    },
    onSuccess: (_, appointmentId) => {
      const appointment = appointments.find(apt => apt.id === appointmentId);
      if (appointment?.patient) {
        logAppointmentRejected(
          `${appointment.patient.first_name} ${appointment.patient.last_name}`,
          format(new Date(appointment.scheduled_time), 'PPP'),
          appointmentId
        );
      }
      
      toast({
        title: "Appointment declined",
        description: "The patient has been notified of the declined appointment.",
      });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to decline appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'approved':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no_show':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
  const pendingAppointments = appointments.filter(apt => apt.status === 'pending').length;
  const approvedAppointments = appointments.filter(apt => apt.status === 'approved').length;

  if (isLoading) {
    return (
      <DoctorLayout title="Today's Appointments" subtitle={`Loading your scheduled appointments for ${format(new Date(), 'EEEE, MMMM d, yyyy')}`}>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout title="Today's Appointments" subtitle={`Manage your scheduled appointments for ${format(new Date(), 'EEEE, MMMM d, yyyy')}`}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white shadow-sm rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-teal-600" />
                </div>
                Today's Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">{totalAppointments}</p>
              <p className="text-sm text-slate-600">appointments</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">{completedAppointments}</p>
              <p className="text-sm text-slate-600">finished</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                Pending Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">{pendingAppointments}</p>
              <p className="text-sm text-slate-600">awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Appointments List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Today's Schedule</h2>
          
          {appointments.length === 0 ? (
            <Card className="bg-white shadow-sm rounded-xl border border-gray-200">
              <CardContent className="p-12 text-center">
                <CalendarDays className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No appointments scheduled today</h3>
                <p className="text-slate-600">
                  Enjoy your free day! Your next appointments will appear here when scheduled.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {appointments.map((appointment) => (
                <Card key={appointment.id} className="bg-white shadow-sm rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {appointment.patient?.first_name || 'Unknown'} {appointment.patient?.last_name || 'Patient'}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="w-4 h-4" />
                            <span>{format(new Date(appointment.scheduled_time), 'h:mm a')}</span>
                            <span className="text-slate-400">•</span>
                            <span>{appointment.duration_minutes || 30} min</span>
                          </div>
                          {appointment.notes && (
                            <p className="text-sm text-slate-600 mt-1 truncate">
                              Reason: {appointment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge className={`${getStatusColor(appointment.status)} border`}>
                          {appointment.status}
                        </Badge>
                        
                        <div className="flex gap-2">
                          {appointment.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => approveAppointmentMutation.mutate(appointment.id)}
                                disabled={approveAppointmentMutation.isPending || declineAppointmentMutation.isPending}
                                className="bg-teal-600 hover:bg-teal-700 text-white"
                              >
                                {approveAppointmentMutation.isPending ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => declineAppointmentMutation.mutate(appointment.id)}
                                disabled={approveAppointmentMutation.isPending || declineAppointmentMutation.isPending}
                              >
                                {declineAppointmentMutation.isPending ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <X className="w-4 h-4 mr-1" />
                                    Decline
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                          
                          {appointment.status === 'approved' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => markCompletedMutation.mutate(appointment.id)}
                                disabled={markCompletedMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                {markCompletedMutation.isPending ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Complete
                                  </>
                                )}
                              </Button>
                              
                              {/* Start Call Button for Doctor */}
                              <DoctorAppointmentCard appointment={appointment} />
                            </>
                          )}
                          
                          <Button size="sm" variant="outline" className="border-teal-300 text-teal-600 hover:bg-teal-50">
                            <Calendar className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DoctorLayout>
  );
};

export default DoctorAppointments;