import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Video, User } from "lucide-react";
import { format } from "date-fns";
import { CallTypeModal } from "@/components/CallTypeModal";
import { CallInterface } from "@/components/CallInterface";
import { useCallSession } from "@/hooks/useCallSession";

interface DoctorAppointmentCardProps {
  appointment: {
    id: string;
    doctor_id: string;
    patient_id: string;
    scheduled_time: string;
    status: string;
    duration_minutes?: number;
    patient?: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
    };
  };
}

export function DoctorAppointmentCard({ appointment }: DoctorAppointmentCardProps) {
  const [showCallModal, setShowCallModal] = useState(false);
  const { activeCall, startCall, endCall } = useCallSession();
  
  const patientName = appointment.patient 
    ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
    : 'Patient';
  
  const patientAvatar = appointment.patient?.avatar_url;
  
  const appointmentDate = new Date(appointment.scheduled_time);
  const isApproved = appointment.status === 'approved';
  const isToday = format(appointmentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const canStartCall = isApproved && isToday;

  const handleStartCall = async (callType: 'voice' | 'video') => {
    try {
      await startCall(appointment.id, appointment.doctor_id, callType);
      setShowCallModal(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  // Call interface is now handled via WebRTC in the messaging components

  if (!canStartCall) {
    return null; // Don't show call button if can't start call
  }

  return (
    <>
      <Button 
        onClick={() => setShowCallModal(true)}
        size="sm"
        className="bg-primary hover:bg-primary/90 text-white"
      >
        <Video className="w-4 h-4 mr-1" />
        Start Call
      </Button>

      <CallTypeModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        onSelectType={handleStartCall}
        doctorName={patientName}
      />
    </>
  );
}