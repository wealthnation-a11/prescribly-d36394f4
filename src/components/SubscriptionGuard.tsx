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
  const { needsSubscription, loading: subLoading, isLegacyUser } = useSubscription();
  const location = useLocation();

  // Admins have full access without subscription checks
  if (userProfile?.role === 'admin') {
    return <>{children}</>;
  }

  // Doctors don't need subscription
  if (userProfile?.role === 'doctor') {
    return <>{children}</>;
  }

  // Legacy users have full access
  if (isLegacyUser) {
    return <>{children}</>;
  }

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

  // If user needs subscription, redirect to subscription page
  if (needsSubscription) {
    return <Navigate to="/subscription" state={{ from: location }} replace />;
  }

  // User has active subscription, render children
  return <>{children}</>;
};