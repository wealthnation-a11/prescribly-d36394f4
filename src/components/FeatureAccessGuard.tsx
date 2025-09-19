import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Lock, Crown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FeatureAccessGuardProps {
  children: React.ReactNode;
  featureName: string;
  requiredSubscription?: boolean;
}

export const FeatureAccessGuard = ({ 
  children, 
  featureName, 
  requiredSubscription = true 
}: FeatureAccessGuardProps) => {
  const { user, userProfile } = useAuth();
  const { needsSubscription, isLegacyUser } = useSubscription();
  const { isAdmin } = useUserRole();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Admin users have full access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Legacy users have full access
  if (isLegacyUser) {
    return <>{children}</>;
  }

  // Doctors don't need subscription for most features
  if (userProfile?.role === 'doctor') {
    return <>{children}</>;
  }

  // If feature doesn't require subscription, allow access
  if (!requiredSubscription) {
    return <>{children}</>;
  }

  // New patients need subscription
  if (needsSubscription) {
    return (
      <>
        <div 
          onClick={() => setShowSubscriptionModal(true)}
          className="cursor-pointer transition-all duration-200 hover:opacity-80"
        >
          {children}
        </div>

        <Dialog open={showSubscriptionModal} onOpenChange={setShowSubscriptionModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
              </div>
              <DialogTitle className="text-center">Subscribe to Access {featureName}</DialogTitle>
              <DialogDescription className="text-center">
                You need an active subscription to access this feature. Subscribe for just ₦15,000/month to unlock all features.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold text-primary">₦15,000/month</div>
                    <div className="text-sm text-muted-foreground">Full access to all features</div>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={() => window.location.href = '/subscription'} 
                className="w-full"
                size="lg"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Subscribe Now
              </Button>

              <Button 
                variant="outline" 
                onClick={() => setShowSubscriptionModal(false)}
                className="w-full"
              >
                Maybe Later
              </Button>

              <div className="text-center">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Crown className="h-3 w-3" />
                  Doctors and existing users get free access
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // User has subscription, allow access
  return <>{children}</>;
};