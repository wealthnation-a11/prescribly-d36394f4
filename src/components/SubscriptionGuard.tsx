import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Lock } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { needsSubscription, loading: subLoading } = useSubscription();
  const location = useLocation();

  // Show loading while checking auth and subscription
  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If patient needs subscription, show subscription required message
  if (needsSubscription) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Subscription Required</h2>
                <p className="text-muted-foreground">
                  You need an active subscription to access this feature. Please subscribe for $10/month.
                </p>
              </div>

              <Button 
                onClick={() => window.location.href = '/subscription'} 
                className="w-full"
                size="lg"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Subscribe Now - $10/month
              </Button>

              <p className="text-xs text-muted-foreground">
                Doctors and existing users get free access
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // User has access, render children
  return <>{children}</>;
};