import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useExchangeRate } from './useExchangeRate';
import { convertNGNtoUSD } from '@/utils/currency';

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
  const { exchangeRate } = useExchangeRate();
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
        // Convert NGN to USD using exchange rate
        const totalEarningsNGN = completedAppointments.reduce((sum, apt) => 
          sum + (apt.consultation_fee * 0.8), 0
        );
        const weeklyEarningsNGN = weeklyCompleted.reduce((sum, apt) => 
          sum + (apt.consultation_fee * 0.8), 0
        );
        const monthlyEarningsNGN = monthlyCompleted.reduce((sum, apt) => 
          sum + (apt.consultation_fee * 0.8), 0
        );

        const averageFeeNGN = completedAppointments.length > 0 
          ? completedAppointments.reduce((sum, apt) => sum + apt.consultation_fee, 0) / completedAppointments.length
          : 0;

        // Convert all values to USD
        setEarnings({
          totalEarnings: convertNGNtoUSD(totalEarningsNGN, exchangeRate),
          totalAppointments: appointments?.length || 0,
          completedAppointments: completedAppointments.length,
          averageFee: convertNGNtoUSD(averageFeeNGN, exchangeRate),
          monthlyEarnings: convertNGNtoUSD(monthlyEarningsNGN, exchangeRate),
          weeklyEarnings: convertNGNtoUSD(weeklyEarningsNGN, exchangeRate),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch earnings');
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [user, exchangeRate]);

  return { earnings, loading, error };
};