import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserRole } from '@/hooks/useUserRole';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isDoctor, loading: roleLoading } = useUserRole();
  const { needsSubscription, loading: subLoading, isLegacyUser } = useSubscription();
  const location = useLocation();

  // Admins have full access without subscription checks
  if (isAdmin) {
    return <>{children}</>;
  }

  // Doctors don't need subscription
  if (isDoctor) {
    return <>{children}</>;
  }

  // Legacy users have full access
  if (isLegacyUser) {
    return <>{children}</>;
  }

  // Show loading while checking auth and subscription
  if (authLoading || roleLoading || subLoading) {
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