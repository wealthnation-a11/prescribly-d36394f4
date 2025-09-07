import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedActivityLogger } from '@/hooks/useEnhancedActivityLogger';

export interface AppointmentUpdate {
  id: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'scheduled';
  scheduled_time: string;
  doctor_id?: string;
  patient_id?: string;
}

export const useRealtimeAppointments = (role: 'doctor' | 'patient') => {
  const { user } = useAuth();
  const { toast } = useToast();
  const enhancedLogger = useEnhancedActivityLogger();
  const [appointments, setAppointments] = useState<AppointmentUpdate[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`${role}-appointments-realtime`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: role === 'doctor' ? `doctor_id=eq.${user.id}` : `patient_id=eq.${user.id}`
        },
        (payload) => {
          console.log(`${role} appointment change:`, payload);
          
          const appointment = payload.new as AppointmentUpdate;
          
          if (payload.eventType === 'INSERT') {
            // New appointment booked
            if (role === 'doctor') {
              toast({
                title: "New Appointment Request",
                description: "A patient has requested an appointment with you.",
              });
            }
          } else if (payload.eventType === 'UPDATE' && appointment) {
            // Appointment status changed
            if (role === 'patient') {
              if (appointment.status === 'approved') {
                toast({
                  title: "Appointment Approved",
                  description: "Your appointment has been approved! You can now chat with the doctor.",
                });
                enhancedLogger.logActivity('appointment', 'Appointment approved by doctor', appointment.id);
              } else if (appointment.status === 'cancelled') {
                toast({
                  title: "Appointment Cancelled",
                  description: "Your appointment has been cancelled.",
                  variant: "destructive",
                });
                enhancedLogger.logActivity('appointment', 'Appointment cancelled by doctor', appointment.id);
              } else if (appointment.status === 'completed') {
                toast({
                  title: "Appointment Completed",
                  description: "Your appointment has been marked as completed.",
                });
                enhancedLogger.logActivity('appointment', 'Appointment completed successfully', appointment.id);
              }
            } else if (role === 'doctor') {
              if (appointment.status === 'completed') {
                toast({
                  title: "Appointment Completed",
                  description: "Appointment has been marked as completed successfully.",
                });
                enhancedLogger.logActivity('appointment', 'Marked appointment as completed', appointment.id);
              }
            }
          }
          
          // Update local state
          setAppointments(prev => {
            const exists = prev.find(apt => apt.id === appointment.id);
            if (exists) {
              return prev.map(apt => apt.id === appointment.id ? appointment : apt);
            } else {
              return [...prev, appointment];
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, role, toast]);

  return { appointments };
};