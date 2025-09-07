import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ActivityType = 'appointment' | 'prescription' | 'chat' | 'profile_update' | 'availability_update';

export const useEnhancedActivityLogger = () => {
  const { user } = useAuth();
  const { isDoctor } = useUserRole();
  const { toast } = useToast();

  const logActivity = async (
    type: ActivityType,
    details: string,
    relatedId?: string
  ) => {
    if (!user?.id) return;

    try {
      const activityData = {
        type,
        details,
        related_id: relatedId || null,
        [isDoctor ? 'doctor_id' : 'user_id']: user.id,
      };

      const { error } = await supabase
        .from('recent_activities')
        .insert(activityData);

      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Appointment-related activities
  const logAppointmentBooked = async (doctorName: string, appointmentDate: string, appointmentId: string) => {
    await logActivity(
      'appointment',
      `Booked appointment with Dr. ${doctorName} for ${new Date(appointmentDate).toLocaleDateString()}`,
      appointmentId
    );
  };

  const logAppointmentApproved = async (patientName: string, appointmentDate: string, appointmentId: string) => {
    await logActivity(
      'appointment',
      `Approved appointment with ${patientName} for ${new Date(appointmentDate).toLocaleDateString()}`,
      appointmentId
    );
  };

  const logAppointmentRejected = async (patientName: string, appointmentDate: string, appointmentId: string) => {
    await logActivity(
      'appointment',
      `Rejected appointment with ${patientName} for ${new Date(appointmentDate).toLocaleDateString()}`,
      appointmentId
    );
  };

  const logAppointmentCompleted = async (patientName: string, appointmentDate: string, appointmentId: string) => {
    await logActivity(
      'appointment',
      `Completed appointment with ${patientName} on ${new Date(appointmentDate).toLocaleDateString()}`,
      appointmentId
    );
  };

  const logAppointmentCancelled = async (otherPartyName: string, appointmentDate: string, appointmentId: string) => {
    const action = isDoctor ? 'Cancelled appointment with' : 'Appointment cancelled by Dr.';
    await logActivity(
      'appointment',
      `${action} ${otherPartyName} for ${new Date(appointmentDate).toLocaleDateString()}`,
      appointmentId
    );
  };

  // Prescription-related activities
  const logPrescriptionIssued = async (patientName: string, prescriptionId: string) => {
    await logActivity(
      'prescription',
      `Issued prescription for ${patientName}`,
      prescriptionId
    );
  };

  const logPrescriptionReceived = async (doctorName: string, prescriptionId: string) => {
    await logActivity(
      'prescription',
      `Received prescription from Dr. ${doctorName}`,
      prescriptionId
    );
  };

  // Chat-related activities
  const logMessageSent = async (recipientName: string, isDoctor: boolean = false) => {
    const prefix = isDoctor ? 'Dr.' : '';
    await logActivity(
      'chat',
      `Sent message to ${prefix}${recipientName}`
    );
  };

  const logMessageReceived = async (senderName: string, isFromDoctor: boolean = false) => {
    const prefix = isFromDoctor ? 'Dr.' : '';
    await logActivity(
      'chat',
      `Received message from ${prefix}${senderName}`
    );
  };

  // Profile-related activities
  const logProfileUpdated = async () => {
    await logActivity(
      'profile_update',
      'Updated profile information'
    );
  };

  // Availability-related activities (doctor only)
  const logAvailabilityUpdated = async () => {
    await logActivity(
      'availability_update',
      'Updated availability schedule'
    );
  };

  return {
    logActivity,
    logAppointmentBooked,
    logAppointmentApproved,
    logAppointmentRejected,
    logAppointmentCompleted,
    logAppointmentCancelled,
    logPrescriptionIssued,
    logPrescriptionReceived,
    logMessageSent,
    logMessageReceived,
    logProfileUpdated,
    logAvailabilityUpdated
  };
};