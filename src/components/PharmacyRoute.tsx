import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePharmacyAccount } from "@/hooks/usePharmacyAccount";

export function PharmacyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { pharmacy, isLoading } = usePharmacyAccount();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/pharmacy-portal" replace />;
  if (!pharmacy) return <Navigate to="/pharmacy-portal" replace />;

  return <>{children}</>;
}
