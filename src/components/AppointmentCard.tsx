import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Video, Phone } from "lucide-react";
import { format } from "date-fns";
import { CallTypeModal } from "@/components/CallTypeModal";
import { CallInterface } from "@/components/CallInterface";
import { useCallSession } from "@/hooks/useCallSession";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

interface AppointmentCardProps {
  appointment: {
    id: string;
    doctor_id: string;
    patient_id?: string;
    scheduled_time: string;
    status: string;
    duration_minutes?: number;
    doctors?: {
      id: string;
      user_id: string;
      specialization: string;
      profiles?: {
        first_name: string;
        last_name: string;
        avatar_url?: string;
      };
    };
    patient?: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
    };
  };
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const [showCallModal, setShowCallModal] = useState(false);
  const { activeCall, startCall, endCall } = useCallSession();
  const { user } = useAuth();
  const { isDoctor } = useUserRole();
  
  // Determine if user is doctor or patient for this appointment
  const isUserDoctor = isDoctor || user?.id === appointment.doctor_id;
  
  // Get the other party's details (doctor for patient, patient for doctor)
  const otherPartyName = isUserDoctor 
    ? appointment.patient 
      ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
      : 'Patient'
    : appointment.doctors?.profiles 
      ? `Dr. ${appointment.doctors.profiles.first_name} ${appointment.doctors.profiles.last_name}`
      : 'Doctor';
  
  const otherPartyAvatar = isUserDoctor 
    ? appointment.patient?.avatar_url
    : appointment.doctors?.profiles?.avatar_url;
    
  const specialization = appointment.doctors?.specialization || 'General Medicine';
  
  const appointmentDate = new Date(appointment.scheduled_time);
  const isApproved = appointment.status === 'approved';
  const isToday = format(appointmentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const canStartCall = isApproved && isToday;

  const handleStartCall = async (callType: 'voice' | 'video') => {
    try {
      const patientId = isUserDoctor ? (appointment.patient_id || '') : user?.id || '';
      const doctorId = isUserDoctor ? user?.id || '' : appointment.doctor_id;
      
      await startCall(appointment.id, doctorId, callType);
      setShowCallModal(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Call interface is now handled via WebRTC in the messaging components
  // The appointment card just shows appointment info and triggers calls from there

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={otherPartyAvatar} />
                <AvatarFallback>{otherPartyName.split(' ').map(n => n.charAt(0)).join('')}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{otherPartyName}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isUserDoctor ? 'Patient' : specialization}
                </p>
              </div>
            </div>
            <Badge className={getStatusColor(appointment.status)}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{format(appointmentDate, 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{format(appointmentDate, 'hh:mm a')}</span>
            </div>
          </div>

          {appointment.duration_minutes && (
            <p className="text-sm text-muted-foreground">
              Duration: {appointment.duration_minutes} minutes
            </p>
          )}

          {canStartCall && (
            <div className="pt-2">
              <Button 
                onClick={() => setShowCallModal(true)}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Video className="w-4 h-4 mr-2" />
                Start Call
              </Button>
            </div>
          )}

          {isApproved && !isToday && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Call will be available on appointment day
            </p>
          )}
        </CardContent>
      </Card>

      <CallTypeModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        onSelectType={handleStartCall}
        doctorName={otherPartyName}
      />
    </>
  );
}