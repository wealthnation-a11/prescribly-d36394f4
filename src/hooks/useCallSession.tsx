import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const useCallSession = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCall, setActiveCall] = useState<any>(null);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall]);

  const startCall = async (appointmentId: string, doctorId: string, callType: 'voice' | 'video') => {
    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .insert({
          appointment_id: appointmentId,
          patient_id: user?.id,
          doctor_id: doctorId,
          channel_name: appointmentId,
          type: callType
        })
        .select()
        .single();

      if (error) throw error;

      setActiveCall(data);
      setCallDuration(0);

      // Log monitoring event
      await supabase.functions.invoke('log-monitoring-event', {
        body: {
          event_type: 'call_started',
          entity_id: data.id,
          event_data: { 
            appointment_id: appointmentId,
            call_type: callType 
          }
        }
      });

      toast({
        title: "Call Started",
        description: `${callType === 'voice' ? 'Voice' : 'Video'} call initiated successfully`,
      });

      return data;
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Error",
        description: "Failed to start call. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const endCall = async () => {
    if (!activeCall) return;

    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', activeCall.id);

      if (error) throw error;

      // Create audit log
      await supabase.functions.invoke('create-audit-log', {
        body: {
          diagnosis_id: activeCall.appointment_id,
          actor_id: user?.id,
          action: 'call_ended',
          details: {
            call_id: activeCall.id,
            duration_seconds: callDuration,
            call_type: activeCall.type
          }
        }
      });

      // Log monitoring event with latency
      await supabase.functions.invoke('log-monitoring-event', {
        body: {
          event_type: 'call_ended',
          entity_id: activeCall.id,
          event_data: {
            duration_seconds: callDuration,
            call_type: activeCall.type
          },
          latency_ms: callDuration * 1000
        }
      });

      setActiveCall(null);
      setCallDuration(0);

      toast({
        title: "Call Ended",
        description: `Call duration: ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')}`,
      });
    } catch (error) {
      console.error('Error ending call:', error);
      toast({
        title: "Error",
        description: "Failed to end call properly",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    activeCall,
    callDuration,
    startCall,
    endCall,
    formatDuration
  };
};