import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { CheckCircle, CreditCard, Clock, Crown, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

const Subscription = () => {
  const { user, userProfile } = useAuth();
  const { subscription, hasActiveSubscription, isSubscriptionExpired, loading, getDaysUntilExpiry } = useSubscription();
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  // If user is legacy or doctor, they don't need subscription
  const hasLegacyAccess = userProfile?.is_legacy || userProfile?.role === 'doctor';

  const handlePaystackPayment = async (plan: 'monthly' | 'yearly') => {
    if (!user?.email) return;

    setProcessing(true);

    try {
      const amount = plan === 'yearly' ? 164000 : 15000;
      
      // Initialize payment with our edge function
      const { data: initData, error: initError } = await supabase.functions.invoke('paystack-initialize', {
        body: {
          email: user.email,
          amount,
          user_id: user.id,
          type: 'subscription',
          plan
        }
      });

      if (initError || !initData.status) {
        throw new Error(initData?.message || 'Payment initialization failed');
      }

      // Redirect to Paystack checkout
      window.location.href = initData.authorization_url;
      
    } catch (error) {
      console.error('Payment initialization failed:', error);
      toast.error('Failed to initialize payment. Please try again.');
      setProcessing(false);
    }
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
              Access all premium features with your subscription or free legacy access
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {hasActiveSubscription || hasLegacyAccess ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {hasLegacyAccess ? 'Free Access' : 'Active Plan'}
                  </Badge>
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">
                    {hasLegacyAccess ? 'Legacy User Access' : 'Monthly Plan'}
                  </h3>
                   <p className="text-2xl font-bold text-primary">
                     {hasLegacyAccess ? 'FREE' : '₦15,000/month'}
                   </p>
                  {hasLegacyAccess && (
                    <p className="text-sm text-muted-foreground">
                      You have free access as an existing user
                    </p>
                  )}
                </div>

                {subscription && !hasLegacyAccess && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Expires on: {format(new Date(subscription.expires_at), 'PPP')}
                      </span>
                    </div>
                  </div>
                )}

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
              <div className="space-y-6">
                {/* Show expired message if subscription expired */}
                {isSubscriptionExpired && subscription && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
                    <p className="text-destructive font-medium">
                      Your subscription has expired!
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Renew now to continue accessing all premium features.
                    </p>
                  </div>
                )}

                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold">
                    {isSubscriptionExpired ? 'Renew Your Subscription' : 'Choose Your Plan'}
                  </h3>
                  <p className="text-muted-foreground">
                    {isSubscriptionExpired 
                      ? 'Your access has been paused. Renew to continue.'
                      : 'Subscribe to access all premium features'}
                  </p>
                </div>

                {/* Monthly Plan */}
                <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <h4 className="text-lg font-semibold">Monthly Plan</h4>
                      </div>
                       <div className="text-right">
                         <p className="text-2xl font-bold text-primary">$10</p>
                         <p className="text-sm text-muted-foreground">/month</p>
                       </div>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✓ Full dashboard access</li>
                      <li>✓ Unlimited chat with doctors</li>
                      <li>✓ Video consultations</li>
                      <li>✓ Appointment booking</li>
                      <li>✓ AI health diagnostics</li>
                    </ul>
                     <Button 
                       onClick={() => handlePaystackPayment('monthly')} 
                       disabled={processing}
                       className="w-full"
                     >
                       <CreditCard className="h-4 w-4 mr-2" />
                       {processing ? 'Processing...' : 'Subscribe Monthly - $10'}
                     </Button>
                  </CardContent>
                </Card>

                {/* Yearly Plan */}
                <Card className="border-2 border-secondary/20 hover:border-secondary/40 transition-colors relative">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-secondary text-secondary-foreground">
                      <Crown className="h-3 w-3 mr-1" />
                      Best Value
                    </Badge>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Crown className="h-5 w-5 text-secondary" />
                        <h4 className="text-lg font-semibold">Yearly Plan</h4>
                      </div>
                       <div className="text-right">
                         <p className="text-2xl font-bold text-secondary">$100</p>
                         <p className="text-sm text-muted-foreground">/year</p>
                         <p className="text-xs text-green-600">Save $20!</p>
                       </div>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✓ Everything in Monthly Plan</li>
                      <li>✓ 2 months free (12 for 10)</li>
                      <li>✓ Priority support</li>
                      <li>✓ Early access to new features</li>
                    </ul>
                     <Button 
                       onClick={() => handlePaystackPayment('yearly')} 
                       disabled={processing}
                       className="w-full"
                       variant="secondary"
                     >
                       <CreditCard className="h-4 w-4 mr-2" />
                       {processing ? 'Processing...' : 'Subscribe Yearly - $100'}
                    </Button>
                  </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground text-center">
                  Secure payment powered by Paystack • Cancel anytime
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default Subscription;