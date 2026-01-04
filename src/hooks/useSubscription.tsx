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
    
    // Check if subscription exists and is active
    if (subscription.status !== 'active') return false;
    
    // Check if subscription has expired
    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);
    
    return expiresAt > now;
  };

  const isSubscriptionExpired = () => {
    if (!subscription) return false;
    
    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);
    
    return expiresAt <= now;
  };

  const needsSubscription = () => {
    // Admins have full access without subscription
    if (userProfile?.role === 'admin') return false;
    
    // Doctors don't need subscription
    if (userProfile?.role === 'doctor') return false;
    
    // Herbal practitioners don't need subscription
    if (userProfile?.role === 'herbal_practitioner') return false;
    
    // Legacy users don't need subscription
    if (userProfile?.is_legacy) return false;
    
    // New patients need active subscription (not expired)
    return userProfile?.role === 'patient' && !hasActiveSubscription();
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
    isSubscriptionExpired: isSubscriptionExpired(),
    getDaysUntilExpiry: getDaysUntilExpiry(),
    refreshSubscription: fetchSubscription,
    isLegacyUser: isLegacyUser(),
  };
};