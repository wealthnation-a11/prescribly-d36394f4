import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useActivityLogger = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const logActivity = async (
    activityType: string,
    activityDescription: string,
    metadata?: Record<string, any>
  ) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_activities')
        .insert({
          user_id: user.id,
          activity_type: activityType,
          activity_description: activityDescription,
          metadata: metadata || {}
        });

      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const logAppointmentBooked = (doctorName: string, appointmentDate: string) => {
    logActivity(
      'appointment_booked',
      `Booked appointment with Dr. ${doctorName}`,
      { doctorName, appointmentDate }
    );
  };

  const logAppointmentApproved = (patientName: string, appointmentDate: string) => {
    logActivity(
      'appointment_approved',
      `Approved appointment with ${patientName}`,
      { patientName, appointmentDate }
    );
  };

  const logAppointmentDeclined = (patientName: string, appointmentDate: string) => {
    logActivity(
      'appointment_declined',
      `Declined appointment with ${patientName}`,
      { patientName, appointmentDate }
    );
  };

  const logAppointmentCompleted = (patientName: string, appointmentDate: string) => {
    logActivity(
      'appointment_completed',
      `Completed appointment with ${patientName}`,
      { patientName, appointmentDate }
    );
  };

  const logMessageSent = (recipientName: string, messageType: 'text' | 'file' | 'voice') => {
    logActivity(
      'message_sent',
      `Sent ${messageType} message to ${recipientName}`,
      { recipientName, messageType }
    );
  };

  const logProfileUpdated = () => {
    logActivity(
      'profile_updated',
      'Updated profile information'
    );
  };

  const logAvailabilityUpdated = () => {
    logActivity(
      'availability_updated',
      'Updated availability schedule'
    );
  };

  const logPaymentProcessed = (amount: number, currency: string) => {
    logActivity(
      'payment_processed',
      `Payment of ${currency} ${amount} processed`,
      { amount, currency }
    );
  };

  return {
    logActivity,
    logAppointmentBooked,
    logAppointmentApproved,
    logAppointmentDeclined,
    logAppointmentCompleted,
    logMessageSent,
    logProfileUpdated,
    logAvailabilityUpdated,
    logPaymentProcessed
  };
};