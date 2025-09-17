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

  const createSubscription = async (paymentReference: string) => {
    if (!user?.id) return;

    const startedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(startedAt.getDate() + 30); // 30 days from now

    try {
      // Insert/update subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          status: 'active',
          plan: 'monthly',
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (subError) throw subError;

      // Insert payment record
      const { error: payError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: 10,
          reference: paymentReference,
          status: 'completed',
        });

      if (payError) throw payError;

      // Refresh subscription data
      await fetchSubscription();
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  };

  return {
    subscription,
    loading,
    hasActiveSubscription: hasActiveSubscription(),
    needsSubscription: needsSubscription(),
    createSubscription,
    refreshSubscription: fetchSubscription,
  };
};