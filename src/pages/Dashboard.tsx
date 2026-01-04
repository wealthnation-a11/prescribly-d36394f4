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

  // If no role assigned, show error
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-6xl text-slate-400 mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Role Not Assigned</h1>
          <p className="text-slate-600 mb-4">Your role is not assigned. Please contact support.</p>
          <a href="/" className="text-primary hover:underline">
            Go back to home
          </a>
        </div>
      </div>
    );
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