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
 * Doctor earnings come from the server-recorded `doctor_earnings` ledger
 * (₦1,500 per completed ₦3,500 consultation, written by a DB trigger).
 */
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
        const { data, error } = await (supabase as any)
          .from('doctor_earnings')
          .select('doctor_earnings, earned_at')
          .eq('doctor_id', user.id);
        if (error) throw error;

        const rows = (data as { doctor_earnings: number; earned_at: string }[]) || [];
        const now = Date.now();
        const week = now - 7 * 864e5;
        const month = now - 30 * 864e5;
        const sum = (list: typeof rows) => list.reduce((s, r) => s + Number(r.doctor_earnings || 0), 0);
        const total = sum(rows);

        setEarnings({
          totalEarnings: total,
          totalAppointments: rows.length,
          completedAppointments: rows.length,
          averageFee: rows.length ? total / rows.length : 0,
          monthlyEarnings: sum(rows.filter((r) => new Date(r.earned_at).getTime() >= month)),
          weeklyEarnings: sum(rows.filter((r) => new Date(r.earned_at).getTime() >= week)),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch earnings');
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
    const channel = supabase
      .channel(`doctor_earnings_hook_${user.id}_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_earnings', filter: `doctor_id=eq.${user.id}` }, fetchEarnings)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { earnings, loading, error };
};
