import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface DoctorEarnings {
  totalEarnings: number;
  totalAppointments: number;
  completedAppointments: number;
  averageFee: number;
  monthlyEarnings: number;
  weeklyEarnings: number;
}

export const useDoctorEarnings = () => {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<DoctorEarnings>({
    totalEarnings: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    averageFee: 0,
    monthlyEarnings: 0,
    weeklyEarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchEarnings = async () => {
      try {
        setLoading(true);
        
        // Fetch all appointments for the doctor
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('doctor_id', user.id);

        if (error) {
          throw error;
        }

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const completedAppointments = appointments?.filter(apt => apt.status === 'completed') || [];
        const weeklyCompleted = completedAppointments.filter(apt => 
          new Date(apt.created_at) >= oneWeekAgo
        );
        const monthlyCompleted = completedAppointments.filter(apt => 
          new Date(apt.created_at) >= oneMonthAgo
        );

        // Calculate earnings (80% of consultation fee goes to doctor, 20% platform fee)
        const totalEarnings = completedAppointments.reduce((sum, apt) => 
          sum + (apt.consultation_fee * 0.8), 0
        );
        const weeklyEarnings = weeklyCompleted.reduce((sum, apt) => 
          sum + (apt.consultation_fee * 0.8), 0
        );
        const monthlyEarnings = monthlyCompleted.reduce((sum, apt) => 
          sum + (apt.consultation_fee * 0.8), 0
        );

        const averageFee = completedAppointments.length > 0 
          ? completedAppointments.reduce((sum, apt) => sum + apt.consultation_fee, 0) / completedAppointments.length
          : 0;

        setEarnings({
          totalEarnings,
          totalAppointments: appointments?.length || 0,
          completedAppointments: completedAppointments.length,
          averageFee,
          monthlyEarnings,
          weeklyEarnings,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch earnings');
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [user]);

  return { earnings, loading, error };
};