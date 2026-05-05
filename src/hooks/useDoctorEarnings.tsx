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

/**
 * Revenue split (NGN):
 *  - Appointment booking ₦15,000  → Doctor ₦8,000   / Platform ₦7,000
 *  - Home visit          ₦47,000  → Doctor ₦33,000  / Platform ₦14,000
 */
const doctorShare = (paymentAmount: number, type?: string | null) => {
  if (!paymentAmount) return 0;
  if (type === 'home_visit') return 33000;
  // default to standard appointment booking
  return 8000;
};

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

        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('doctor_id', user.id);

        if (error) throw error;

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const completed = appointments?.filter((a) => a.status === 'completed') || [];
        const weekly = completed.filter((a) => new Date(a.created_at) >= oneWeekAgo);
        const monthly = completed.filter((a) => new Date(a.created_at) >= oneMonthAgo);

        const sumDoctor = (list: any[]) =>
          list.reduce((s, a) => s + doctorShare(a.payment_amount || 0, a.appointment_type), 0);

        const totalDoctor = sumDoctor(completed);
        const averageFee = completed.length > 0 ? totalDoctor / completed.length : 0;

        setEarnings({
          totalEarnings: totalDoctor,
          totalAppointments: appointments?.length || 0,
          completedAppointments: completed.length,
          averageFee,
          monthlyEarnings: sumDoctor(monthly),
          weeklyEarnings: sumDoctor(weekly),
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
