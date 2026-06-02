import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";

const Dashboard = () => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { role, isAdmin, isDoctor, isPatient, loading: roleLoading } = useUserRole();
  const { needsSubscription, loading: subLoading, isLegacyUser } = useSubscription();

  // Show loading while checking authentication, role and subscription
  if (authLoading || roleLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If role hasn't synced yet, default to the patient dashboard instead of an error screen
  if (!role) {
    return <Navigate to="/user-dashboard" replace />;
  }

  // Redirect based on role
  if (isAdmin) {
    return <Navigate to="/admin-dashboard" replace />;
  }
  
  if (isDoctor) {
    return <Navigate to="/doctor-dashboard" replace />;
  }
  
  if (isPatient) {
    // Check if patient needs subscription before accessing dashboard
    if (needsSubscription && !isLegacyUser) {
      return <Navigate to="/subscription" replace />;
    }
    return <Navigate to="/user-dashboard" replace />;
  }

  // Fallback - shouldn't reach here
  return <Navigate to="/login" replace />;
};

export default Dashboard;