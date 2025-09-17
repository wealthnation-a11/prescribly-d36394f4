import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { CheckCircle, CreditCard, Clock } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

const Subscription = () => {
  const { user } = useAuth();
  const { subscription, hasActiveSubscription, createSubscription, loading } = useSubscription();
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  const handlePaystackPayment = () => {
    if (!user?.email) return;

    setProcessing(true);

    const handler = window.PaystackPop.setup({
      key: 'pk_live_YOUR_PAYSTACK_PUBLIC_KEY', // Replace with your actual Paystack public key
      email: user.email,
      amount: 1000, // $10 in kobo (Paystack uses kobo for USD)
      currency: 'USD',
      callback: async (response: any) => {
        try {
          await createSubscription(response.reference);
          toast.success('Subscription activated successfully!');
          navigate('/user-dashboard');
        } catch (error) {
          console.error('Subscription creation failed:', error);
          toast.error('Failed to activate subscription. Please try again.');
        } finally {
          setProcessing(false);
        }
      },
      onClose: () => {
        setProcessing(false);
      },
    });

    handler.openIframe();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Loading subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Subscription</CardTitle>
            <p className="text-muted-foreground">
              Manage your subscription to access all features
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {hasActiveSubscription && subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Active Plan
                  </Badge>
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Monthly Plan</h3>
                  <p className="text-2xl font-bold text-primary">$10/month</p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Expires on: {format(new Date(subscription.expires_at), 'PPP')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Included Features:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Access to dashboard</li>
                    <li>✓ Chat with doctors</li>
                    <li>✓ Video calls</li>
                    <li>✓ Book appointments</li>
                    <li>✓ Health diagnostics</li>
                    <li>✓ Health companion</li>
                    <li>✓ Health challenges</li>
                  </ul>
                </div>

                <Button 
                  onClick={() => navigate('/user-dashboard')} 
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Subscribe Now</h3>
                  <p className="text-3xl font-bold text-primary">$10/month</p>
                  <p className="text-sm text-muted-foreground">
                    Access all premium features
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">What's included:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Full dashboard access</li>
                    <li>✓ Unlimited chat with doctors</li>
                    <li>✓ Video consultations</li>
                    <li>✓ Appointment booking</li>
                    <li>✓ AI health diagnostics</li>
                    <li>✓ Personal health companion</li>
                    <li>✓ Health challenges & rewards</li>
                  </ul>
                </div>

                <Button 
                  onClick={handlePaystackPayment} 
                  disabled={processing}
                  className="w-full"
                  size="lg"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Subscribe Now - $10/month'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Secure payment powered by Paystack
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Load Paystack inline script */}
      <script src="https://js.paystack.co/v1/inline.js"></script>
    </div>
  );
};

export default Subscription;