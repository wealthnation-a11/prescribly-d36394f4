import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedActivityLogger } from '@/hooks/useEnhancedActivityLogger';

export interface PrescriptionUpdate {
  id: string;
  patient_id: string;
  doctor_id: string;
  diagnosis: string | null;
  instructions: string | null;
  medications: any;
  status: 'pending' | 'active' | 'expired';
  issued_at: string;
}

export const useRealtimePrescriptions = (role: 'doctor' | 'patient') => {
  const { user } = useAuth();
  const { toast } = useToast();
  const enhancedLogger = useEnhancedActivityLogger();
  const [prescriptions, setPrescriptions] = useState<PrescriptionUpdate[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`${role}-prescriptions-realtime`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prescriptions',
          filter: role === 'doctor' ? `doctor_id=eq.${user.id}` : `patient_id=eq.${user.id}`
        },
        (payload) => {
          console.log(`${role} prescription change:`, payload);
          
          const prescription = payload.new as PrescriptionUpdate;
          
          if (payload.eventType === 'INSERT') {
            if (role === 'patient') {
              toast({
                title: "New Prescription",
                description: "A new prescription has been issued by your doctor.",
              });
              enhancedLogger.logActivity('prescription', 'New prescription received from doctor', prescription.id);
            } else if (role === 'doctor') {
              toast({
                title: "Prescription Created",
                description: "Prescription has been successfully created and sent to patient.",
              });
              enhancedLogger.logActivity('prescription', 'Prescription issued to patient', prescription.id);
            }
          } else if (payload.eventType === 'UPDATE' && prescription) {
            if (role === 'patient' && prescription.status === 'active') {
              toast({
                title: "Prescription Activated",
                description: "Your prescription is now active and ready for use.",
              });
            }
          }
          
          // Update local state
          setPrescriptions(prev => {
            const exists = prev.find(presc => presc.id === prescription.id);
            if (exists) {
              return prev.map(presc => presc.id === prescription.id ? prescription : presc);
            } else {
              return [...prev, prescription];
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, role, toast]);

  return { prescriptions };
};