import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Subscription {
  id: string;
  status: string;
  plan: string;
  expires_at: string;
  started_at: string;
}

export const useSubscription = () => {
  const { user, userProfile } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user?.id]);

  const hasActiveSubscription = () => {
    if (!subscription) return false;
    
    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);
    
    return subscription.status === 'active' && expiresAt > now;
  };

  const needsSubscription = () => {
    // Doctors don't need subscription
    if (userProfile?.role === 'doctor') return false;
    
    // Legacy users don't need subscription
    if (userProfile?.is_legacy) return false;
    
    // New patients need active subscription
    return userProfile?.role === 'patient' && !userProfile?.is_legacy && !hasActiveSubscription();
  };

  const isLegacyUser = () => {
    return userProfile?.is_legacy === true;
  };

  const getDaysUntilExpiry = () => {
    if (!subscription || !hasActiveSubscription()) return 0;
    
    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);
    const timeDiff = expiresAt.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return Math.max(0, daysDiff);
  };

  return {
    subscription,
    loading,
    hasActiveSubscription: hasActiveSubscription(),
    needsSubscription: needsSubscription(),
    getDaysUntilExpiry: getDaysUntilExpiry(),
    refreshSubscription: fetchSubscription,
    isLegacyUser: isLegacyUser(),
  };
};