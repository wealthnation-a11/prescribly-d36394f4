import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useHerbalPractitioner } from '@/hooks/useHerbalPractitioner';
import { useDoctorApproval } from '@/hooks/useDoctorApproval';


interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireDoctor?: boolean;
  requirePatient?: boolean;
  requireApprovedDoctor?: boolean;
  requireHerbalPractitioner?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireAdmin = false, 
  requireDoctor = false, 
  requirePatient = false,
  requireApprovedDoctor = false,
  requireHerbalPractitioner = false,
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { role, isAdmin, isDoctor, isPatient, loading: roleLoading } = useUserRole();
  const { isApproved: isApprovedHerbalPractitioner, isLoading: herbalLoading } = useHerbalPractitioner();
  const { isApproved: isDoctorApproved, isLoading: doctorApprovalLoading } = useDoctorApproval();
  const location = useLocation();

  // Show loading while authentication is being checked
  if (authLoading || roleLoading || (requireHerbalPractitioner && herbalLoading) || (requireApprovedDoctor && doctorApprovalLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role hasn't synced yet, keep showing the loading spinner instead of an error screen
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Role-based access control — silently redirect to /dashboard which will route the user to the right home
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireDoctor && !isDoctor) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requirePatient && !isPatient) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireHerbalPractitioner && !isApprovedHerbalPractitioner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-6xl text-slate-400 mb-4">403</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-4">This page is only accessible to approved herbal practitioners.</p>
          <a href="/herbal-login" className="text-primary hover:underline">
            Go to herbal practitioner login
          </a>
        </div>
      </div>
    );
  }

  // Doctor approval check
  if (requireApprovedDoctor && isDoctor && !isDoctorApproved) {
    return <Navigate to="/doctor-pending-approval" replace />;
  }

  return <>{children}</>;
};