import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from './useGeolocation';
import { CurrencyService, PricingData } from '@/services/CurrencyService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useMultiCurrencyPayment = () => {
  const { user } = useAuth();
  const { location } = useGeolocation();
  const [loading, setLoading] = useState(false);

  /**
   * Get subscription pricing in user's currency
   */
  const getSubscriptionPricing = async (plan: 'monthly' | 'yearly'): Promise<PricingData | null> => {
    if (!location) return null;
    
    try {
      return await CurrencyService.getSubscriptionPricing(location.currency, plan);
    } catch (error) {
      console.error('Failed to get subscription pricing:', error);
      return null;
    }
  };

  /**
   * Get consultation pricing in user's currency
   */
  const getConsultationPricing = async (): Promise<PricingData | null> => {
    if (!location) return null;
    
    try {
      return await CurrencyService.getConsultationPricing(location.currency);
    } catch (error) {
      console.error('Failed to get consultation pricing:', error);
      return null;
    }
  };

  /**
   * Initialize payment with appropriate provider
   */
  const initializePayment = async (
    type: 'subscription' | 'consultation',
    plan?: 'monthly' | 'yearly',
    appointmentId?: string
  ): Promise<string | null> => {
    if (!user?.email || !location) {
      toast.error('User authentication or location required');
      return null;
    }

    setLoading(true);

    try {
      let pricing: PricingData | null;
      
      if (type === 'subscription' && plan) {
        pricing = await getSubscriptionPricing(plan);
      } else if (type === 'consultation') {
        pricing = await getConsultationPricing();
      } else {
        throw new Error('Invalid payment type or missing plan');
      }

      if (!pricing) {
        throw new Error('Failed to get pricing information');
      }

      // Use Paystack for all currencies
      const functionName = 'paystack-initialize';
      
      const body: any = {
        email: user.email,
        amount: pricing.baseUSD, // Always base $10 USD
        currency: pricing.localCurrency,
        user_id: user.id,
        type,
        local_amount: pricing.localAmount,
        base_usd_amount: pricing.baseUSD,
        exchange_rate_used: pricing.localAmount / pricing.baseUSD
      };

      if (plan) body.plan = plan;
      if (appointmentId) body.appointment_id = appointmentId;

      const { data: initData, error: initError } = await supabase.functions.invoke(functionName, {
        body
      });

      if (initError || !initData.status) {
        throw new Error(initData?.message || 'Payment initialization failed');
      }

      return initData.authorization_url || initData.url;
      
    } catch (error) {
      console.error('Payment initialization failed:', error);
      toast.error('Failed to initialize payment. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initialize subscription payment
   */
  const initializeSubscriptionPayment = async (plan: 'monthly' | 'yearly'): Promise<string | null> => {
    return initializePayment('subscription', plan);
  };

  /**
   * Initialize consultation payment
   */
  const initializeConsultationPayment = async (appointmentId: string): Promise<string | null> => {
    return initializePayment('consultation', undefined, appointmentId);
  };

  return {
    location,
    loading,
    getSubscriptionPricing,
    getConsultationPricing,
    initializeSubscriptionPayment,
    initializeConsultationPayment,
    formatAmount: CurrencyService.formatAmount
  };
};