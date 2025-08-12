import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExchangeRate {
  currency: string;
  rate: number;
  updated_at: string;
}

export const useExchangeRate = () => {
  const [exchangeRate, setExchangeRate] = useState<number>(0.0012); // Default fallback rate
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('exchange_rates')
          .select('rate, updated_at')
          .eq('currency', 'NGN_TO_USD')
          .single();

        if (error) {
          console.error('Error fetching exchange rate:', error);
          setError('Failed to fetch exchange rate');
          return;
        }

        if (data) {
          setExchangeRate(data.rate);
        }
      } catch (err) {
        console.error('Exchange rate fetch error:', err);
        setError('Failed to fetch exchange rate');
      } finally {
        setLoading(false);
      }
    };

    fetchExchangeRate();

    // Set up real-time subscription for exchange rate updates
    const channel = supabase
      .channel('exchange-rate-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'exchange_rates',
          filter: 'currency=eq.NGN_TO_USD'
        },
        (payload) => {
          const newData = payload.new as ExchangeRate;
          setExchangeRate(newData.rate);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { exchangeRate, loading, error };
};