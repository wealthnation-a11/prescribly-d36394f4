import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useUserRole = () => {
  const { user, profileLoading } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Check admin/moderator roles via secure has_role RPC (user_roles table)
        const [adminCheck, moderatorCheck] = await Promise.all([
          supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' as any }),
          supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' as any }),
        ]);

        if (adminCheck.data) {
          setRole('admin');
        } else if (moderatorCheck.data) {
          setRole('moderator');
        } else {
          // For non-admin roles, use the profiles table role field
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          
          setRole(profile?.role || 'patient');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user?.id]);

  const isAdmin = role === 'admin';
  const isDoctor = role === 'doctor';
  const isPatient = role === 'patient' || role === 'user';

  return { role, isAdmin, isDoctor, isPatient, loading: loading || profileLoading };
};
