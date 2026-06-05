import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface InitOptions {
  metadata?: Record<string, any>;
}

export const useConsultationPayment = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const initializePayment = async (appointmentIdOrRef: string, options: InitOptions = {}) => {
    if (!user?.email) {
      toast.error('User not authenticated');
      return null;
    }

    setLoading(true);

    try {
      const isUuid = UUID_RE.test(appointmentIdOrRef);
      const body: Record<string, any> = {
        email: user.email,
        amount: 3000,
        type: 'consultation',
        currency: 'NGN',
        metadata: {
          ...(options.metadata || {}),
          ...(isUuid ? {} : { client_ref: appointmentIdOrRef }),
        },
      };
      if (isUuid) body.appointment_id = appointmentIdOrRef;

      const { data: initData, error: initError } = await supabase.functions.invoke('flutterwave-initialize', {
        body,
      });

      if (initError) {
        console.error('Edge function error:', initError);
        throw new Error(initError.message || 'Payment initialization failed. Please try again.');
      }
      if (!initData?.status) {
        throw new Error(initData?.message || 'Payment initialization failed. Please try again.');
      }

      return initData.authorization_url as string;
    } catch (error: any) {
      console.error('Payment initialization failed:', error);
      toast.error(error?.message || 'Failed to initialize payment. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (transactionId: string, txRef?: string) => {
    try {
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('flutterwave-verify', {
        body: { transaction_id: transactionId, tx_ref: txRef },
      });

      if (verifyError || !verifyData?.status) {
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
        .eq('patient_id', user?.id)
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
    loading,
  };
};
