import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useUserRole = () => {
  const { user, userProfile, profileLoading } = useAuth();
  
  // Use cached profile data instead of making new API calls
  const role = userProfile?.role || null;
  const loading = profileLoading;

  const isAdmin = role === 'admin';
  const isDoctor = role === 'doctor';
  const isPatient = role === 'patient';

  return { role, isAdmin, isDoctor, isPatient, loading };
};