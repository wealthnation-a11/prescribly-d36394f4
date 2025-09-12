import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

export interface RecentActivity {
  activity_id: string;
  user_id: string | null;
  doctor_id: string | null;
  type: 'appointment' | 'prescription' | 'chat' | 'profile_update' | 'availability_update' | 'diagnosis' | 'earnings';
  details: string;
  timestamp: string;
  related_id: string | null;
  created_at: string;
}

export const useRecentActivities = (limit: number = 10) => {
  const { user } = useAuth();
  const { isDoctor } = useUserRole();
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchActivities = async () => {
      try {
        setLoading(true);
        
        let query = supabase
          .from('recent_activities')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(limit);

        // Filter based on user role
        if (isDoctor) {
          query = query.eq('doctor_id', user.id);
        } else {
          query = query.eq('user_id', user.id);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        setActivities((data || []) as RecentActivity[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch activities');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    // Set up real-time subscription
    const channel = supabase
      .channel('recent_activities_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recent_activities',
          filter: isDoctor ? `doctor_id=eq.${user.id}` : `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Recent activity change:', payload);
          fetchActivities(); // Refetch activities on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isDoctor, limit]);

  const logActivity = async (
    type: RecentActivity['type'],
    details: string,
    relatedId?: string
  ) => {
    if (!user) return;

    try {
      const activityData = {
        type,
        details,
        related_id: relatedId || null,
        [isDoctor ? 'doctor_id' : 'user_id']: user.id,
      };

      const { error } = await supabase
        .from('recent_activities')
        .insert(activityData);

      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  return { activities, loading, error, logActivity };
};