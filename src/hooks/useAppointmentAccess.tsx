import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useAppointmentAccess = () => {
  const { user } = useAuth();
  const [accessibleDoctors, setAccessibleDoctors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccessibleDoctors = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('doctor_id')
          .eq('patient_id', user.id)
          .in('status', ['approved', 'completed']);

        if (error) throw error;

        const doctorIds = appointments?.map(apt => apt.doctor_id) || [];
        setAccessibleDoctors(doctorIds);
      } catch (error) {
        console.error('Error fetching accessible doctors:', error);
        setAccessibleDoctors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAccessibleDoctors();

    // Subscribe to appointment changes
    const channel = supabase
      .channel('appointment-access-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${user?.id}`
        },
        () => {
          fetchAccessibleDoctors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const canChatWithDoctor = (doctorId: string) => {
    return accessibleDoctors.includes(doctorId);
  };

  return { accessibleDoctors, canChatWithDoctor, loading };
};