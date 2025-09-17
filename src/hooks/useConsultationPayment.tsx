import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useConsultationPayment = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const initializePayment = async (appointmentId: string) => {
    if (!user?.email) {
      toast.error('User not authenticated');
      return null;
    }

    setLoading(true);

    try {
      // Initialize payment with our edge function
      const { data: initData, error: initError } = await supabase.functions.invoke('paystack-initialize', {
        body: {
          email: user.email,
          amount: 10, // $10 consultation fee
          user_id: user.id,
          type: 'consultation',
          appointment_id: appointmentId
        }
      });

      if (initError || !initData.status) {
        throw new Error(initData?.message || 'Payment initialization failed');
      }

      return initData.authorization_url;
      
    } catch (error) {
      console.error('Payment initialization failed:', error);
      toast.error('Failed to initialize payment. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (reference: string) => {
    try {
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('paystack-verify', {
        body: { reference }
      });

      if (verifyError || !verifyData.status) {
        throw new Error(verifyData?.message || 'Payment verification failed');
      }

      toast.success('Payment verified successfully!');
      return true;
      
    } catch (error) {
      console.error('Payment verification failed:', error);
      toast.error('Payment verification failed. Please contact support.');
      return false;
    }
  };

  const hasPaymentForAppointment = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('consultation_payments')
        .select('*')
        .eq('user_id', user?.id)
        .eq('appointment_id', appointmentId)
        .eq('status', 'completed')
        .maybeSingle();

      if (error) throw error;
      return !!data;
      
    } catch (error) {
      console.error('Error checking consultation payment:', error);
      return false;
    }
  };

  return {
    initializePayment,
    verifyPayment,
    hasPaymentForAppointment,
    loading
  };
};