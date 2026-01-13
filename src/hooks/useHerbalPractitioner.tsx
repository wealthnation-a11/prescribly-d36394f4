import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useHerbalPractitioner = () => {
  const { user } = useAuth();

  const { data: practitioner, isLoading } = useQuery({
    queryKey: ['herbal-practitioner', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('herbal_practitioners')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // maybeSingle returns null if no rows found, only throws on actual errors
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return {
    practitioner,
    isLoading,
    isApproved: practitioner?.verification_status === 'approved',
    isPending: practitioner?.verification_status === 'pending',
    isRejected: practitioner?.verification_status === 'rejected',
  };
};
