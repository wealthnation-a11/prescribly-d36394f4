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

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('trxref');
      const paymentStatus = searchParams.get('payment');
      
      if (!reference || paymentStatus !== 'success') {
        setStatus('failed');
        setMessage('Payment was cancelled or failed');
        return;
      }

      try {
        // Verify payment with our edge function
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('paystack-verify', {
          body: { reference }
        });

        if (verifyError || !verifyData.status) {
          throw new Error(verifyData?.message || 'Payment verification failed');
        }

        setStatus('success');
        
        if (verifyData.data.type === 'subscription') {
          setMessage('Subscription activated successfully!');
          toast.success('Welcome! Your subscription is now active.');
          setTimeout(() => navigate('/user-dashboard'), 2000);
        } else if (verifyData.data.type === 'consultation') {
          setMessage('Consultation payment completed!');
          toast.success('You can now chat with your doctor.');
          
          // Check for consultation callback
          const callbackData = localStorage.getItem('consultation_payment_callback');
          if (callbackData) {
            const { appointmentId } = JSON.parse(callbackData);
            localStorage.removeItem('consultation_payment_callback');
            setTimeout(() => navigate(`/chat?appointment=${appointmentId}`), 2000);
          } else {
            setTimeout(() => navigate('/chat'), 2000);
          }
        } else if (verifyData.data.type === 'order') {
          setMessage('Order placed successfully!');
          toast.success('Your order has been confirmed.');
          
          // Clear pending order from localStorage
          localStorage.removeItem('pending_order');
          
          setTimeout(() => navigate('/herbal/my-orders'), 2000);
        }
        
      } catch (error) {
        console.error('Payment verification failed:', error);
        setStatus('failed');
        setMessage('Payment verification failed. Please contact support if your payment was deducted.');
        toast.error('Payment verification failed');
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
              <Button onClick={() => navigate('/subscription')} className="w-full">
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