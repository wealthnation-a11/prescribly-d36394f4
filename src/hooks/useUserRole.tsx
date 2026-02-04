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
        // Check roles using the secure has_role RPC function
        const [adminCheck, doctorCheck, patientCheck] = await Promise.all([
          supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
          supabase.rpc('has_role', { _user_id: user.id, _role: 'doctor' }),
          supabase.rpc('has_role', { _user_id: user.id, _role: 'patient' }),
        ]);

        if (adminCheck.data) {
          setRole('admin');
        } else if (doctorCheck.data) {
          setRole('doctor');
        } else if (patientCheck.data) {
          setRole('patient');
        } else {
          // Fallback: check user_roles table directly
          const { data } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();
          
          setRole(data?.role || null);
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
  const isPatient = role === 'patient';

  return { role, isAdmin, isDoctor, isPatient, loading: loading || profileLoading };
};
