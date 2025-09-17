import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface UserDashboardStats {
  totalConsultations: number;
  nextAppointment: {
    id: string;
    doctorName: string;
    appointmentDate: string;
    status: 'approved' | 'pending';
    notes?: string;
  } | null;
}

export const useUserDashboardStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserDashboardStats>({
    totalConsultations: 0,
    nextAppointment: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch total completed consultations/appointments
      const { count: totalConsultations, error: consultationsError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', user.id)
        .eq('status', 'completed');

      if (consultationsError) throw consultationsError;

      // Fetch next upcoming appointment (approved or pending)
      const { data: nextAppointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_time,
          doctor_id,
          status,
          notes
        `)
        .eq('patient_id', user.id)
        .in('status', ['approved', 'pending'])
        .gte('scheduled_time', new Date().toISOString())
        .order('scheduled_time', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (appointmentError) throw appointmentError;

      let nextAppointment = null;
      
      if (nextAppointmentData) {
        // Fetch doctor profile separately to avoid join issues
        const { data: doctorProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', nextAppointmentData.doctor_id)
          .maybeSingle();

        const doctorName = doctorProfile
          ? `Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}`
          : 'Doctor';

        nextAppointment = {
          id: nextAppointmentData.id,
          doctorName,
          appointmentDate: nextAppointmentData.scheduled_time,
          status: nextAppointmentData.status as 'approved' | 'pending',
          notes: nextAppointmentData.notes
        };
      }

      setStats({
        totalConsultations: totalConsultations || 0,
        nextAppointment,
      });

    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  // Refresh stats when appointments are completed
  const refreshConsultations = async () => {
    if (!user?.id) return;
    
    const { count, error } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', user.id)
      .eq('status', 'completed');

    if (!error) {
      setStats(prev => ({
        ...prev,
        totalConsultations: count || 0
      }));
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up real-time subscription for appointment updates
    const channel = supabase
      .channel('user-dashboard-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Appointment change detected:', payload);
          
          // If appointment was completed, refresh consultation count
          if (payload.new && (payload.new as any).status === 'completed') {
            refreshConsultations();
          }
          
          // Refresh all stats for any appointment changes
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { 
    stats, 
    loading, 
    error, 
    refreshStats: fetchStats,
    refreshConsultations
  };
};