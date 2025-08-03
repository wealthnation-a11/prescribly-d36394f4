import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalConsultations: number;
  consultationsThisMonth: number;
  activePrescriptions: number;
  expiringPrescriptions: number;
  nextAppointment: {
    date: string | null;
    time: string | null;
    doctorName: string | null;
  } | null;
}

export const useDashboardStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalConsultations: 0,
    consultationsThisMonth: 0,
    activePrescriptions: 0,
    expiringPrescriptions: 0,
    nextAppointment: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current month start and end dates
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Fetch total completed consultations
        const { data: completedAppointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('id, created_at')
          .eq('patient_id', user.id)
          .eq('status', 'completed');

        if (appointmentsError) throw appointmentsError;

        const totalConsultations = completedAppointments?.length || 0;
        const consultationsThisMonth = completedAppointments?.filter(apt => {
          const createdAt = new Date(apt.created_at);
          return createdAt >= currentMonthStart && createdAt <= currentMonthEnd;
        }).length || 0;

        // Fetch active prescriptions (using 'pending' as active status)
        const { data: activePrescriptionsData, error: prescriptionsError } = await supabase
          .from('prescriptions')
          .select('id, issued_at')
          .eq('patient_id', user.id)
          .eq('status', 'pending');

        if (prescriptionsError) throw prescriptionsError;

        const activePrescriptions = activePrescriptionsData?.length || 0;
        
        // For expiring prescriptions, we'll assume prescriptions expire 30 days after issued_at
        // since there's no expiry_date column in the current schema
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        
        const expiringPrescriptions = activePrescriptionsData?.filter(prescription => {
          const issuedAt = new Date(prescription.issued_at);
          const estimatedExpiry = new Date(issuedAt);
          estimatedExpiry.setDate(estimatedExpiry.getDate() + 30); // Assume 30-day prescriptions
          return estimatedExpiry <= threeDaysFromNow;
        }).length || 0;

        // Fetch next upcoming appointment
        const { data: upcomingAppointments, error: upcomingError } = await supabase
          .from('appointments')
          .select(`
            id,
            scheduled_time,
            doctors!inner(
              user_id,
              profiles!inner(first_name, last_name)
            )
          `)
          .eq('patient_id', user.id)
          .in('status', ['scheduled'])
          .gte('scheduled_time', new Date().toISOString())
          .order('scheduled_time', { ascending: true })
          .limit(1);

        if (upcomingError) throw upcomingError;

        let nextAppointment = null;
        if (upcomingAppointments && upcomingAppointments.length > 0) {
          const appointment = upcomingAppointments[0];
          const scheduledTime = new Date(appointment.scheduled_time);
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          let dateText;
          if (scheduledTime.toDateString() === today.toDateString()) {
            dateText = 'Today';
          } else if (scheduledTime.toDateString() === tomorrow.toDateString()) {
            dateText = 'Tomorrow';
          } else {
            dateText = scheduledTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            });
          }

          const timeText = scheduledTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          const doctorData = appointment.doctors as any;
          const doctorName = doctorData?.profiles ? 
            `Dr. ${doctorData.profiles.first_name} ${doctorData.profiles.last_name}` : 
            'Unknown Doctor';

          nextAppointment = {
            date: dateText,
            time: timeText,
            doctorName
          };
        }

        setStats({
          totalConsultations,
          consultationsThisMonth,
          activePrescriptions,
          expiringPrescriptions,
          nextAppointment,
        });

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats');
        console.error('Dashboard stats error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [user]);

  return { stats, loading, error };
};