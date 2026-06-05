import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifying payment...');
  const [retryPath, setRetryPath] = useState<string>('/subscription');

  // Decide where Try Again should send the user
  useEffect(() => {
    const raw = localStorage.getItem('consultation_payment_callback');
    if (raw) setRetryPath('/book-appointment/chat');
    else if (localStorage.getItem('pending_order')) setRetryPath('/herbal/shopping-cart');
  }, []);


  useEffect(() => {
    const verifyPayment = async () => {
      // Flutterwave returns: status, transaction_id, tx_ref
      const flwStatus = searchParams.get('status');
      const transactionId = searchParams.get('transaction_id');
      const txRef = searchParams.get('tx_ref');
      
      // Also support Paystack legacy params
      const paystackRef = searchParams.get('trxref');
      const paystackPayment = searchParams.get('payment');
      
      if (flwStatus === 'cancelled') {
        setStatus('failed');
        setMessage('Payment was cancelled');
        return;
      }

      // Flutterwave flow
      if (transactionId && flwStatus === 'successful') {
        try {
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('flutterwave-verify', {
            body: { transaction_id: transactionId, tx_ref: txRef }
          });

          if (verifyError || !verifyData?.status) {
            throw new Error(verifyData?.message || 'Payment verification failed');
          }

          handleSuccess(verifyData.data);
        } catch (error) {
          console.error('Payment verification failed:', error);
          setStatus('failed');
          setMessage('Payment verification failed. Please contact support if your payment was deducted.');
          toast.error('Payment verification failed');
        }
        return;
      }

      // Paystack legacy flow
      if (paystackRef && paystackPayment === 'success') {
        try {
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('paystack-verify', {
            body: { reference: paystackRef }
          });

          if (verifyError || !verifyData?.status) {
            throw new Error(verifyData?.message || 'Payment verification failed');
          }

          handleSuccess(verifyData.data);
        } catch (error) {
          console.error('Payment verification failed:', error);
          setStatus('failed');
          setMessage('Payment verification failed. Please contact support if your payment was deducted.');
          toast.error('Payment verification failed');
        }
        return;
      }

      setStatus('failed');
      setMessage('Payment was cancelled or failed');
    };

    const handleSuccess = (data: { type: string }) => {
      setStatus('success');
      
      if (data.type === 'subscription') {
        setMessage('Subscription activated successfully!');
        toast.success('Welcome! Your subscription is now active.');
        setTimeout(() => navigate('/user-dashboard'), 2000);
      } else if (data.type === 'consultation') {
        setMessage('Consultation payment completed!');
        toast.success('You can now chat with your doctor.');
        
        const callbackData = localStorage.getItem('consultation_payment_callback');
        if (callbackData) {
          const { appointmentId } = JSON.parse(callbackData);
          localStorage.removeItem('consultation_payment_callback');
          setTimeout(() => navigate(`/chat?appointment=${appointmentId}`), 2000);
        } else {
          setTimeout(() => navigate('/chat'), 2000);
        }
      } else if (data.type === 'order') {
        setMessage('Order placed successfully!');
        toast.success('Your order has been confirmed.');
        localStorage.removeItem('pending_order');
        setTimeout(() => navigate('/herbal/my-orders'), 2000);
      }
    };


    verifyPayment();
  }, [searchParams, navigate]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'failed':
        return <XCircle className="h-12 w-12 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          {getIcon()}
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {status === 'loading' && 'Processing Payment'}
              {status === 'success' && 'Payment Successful'}
              {status === 'failed' && 'Payment Failed'}
            </h1>
            <p className="text-muted-foreground">{message}</p>
          </div>

          {status === 'failed' && (
            <div className="space-y-3">
              <Button onClick={() => navigate(retryPath)} className="w-full">
                Try Again
              </Button>
              <Button onClick={() => navigate('/user-dashboard')} variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}

          
          {status === 'success' && (
            <div className="text-sm text-muted-foreground">
              Redirecting in 2 seconds...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCallback;