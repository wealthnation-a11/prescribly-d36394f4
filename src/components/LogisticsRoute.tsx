import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLogisticsAccount } from "@/hooks/useLogisticsAccount";

export function LogisticsRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { company, isLoading } = useLogisticsAccount();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !company) return <Navigate to="/logistics-portal" replace />;

  return <>{children}</>;
}
