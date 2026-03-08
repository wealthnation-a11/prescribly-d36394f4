import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function FacilityRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const { data: staffRecord, isLoading: staffLoading } = useQuery({
    queryKey: ["facility-staff", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_staff")
        .select("id, facility_id, role, is_active")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (authLoading || staffLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/facility-login" replace />;
  if (!staffRecord) return <Navigate to="/facility-login" replace />;

  return <>{children}</>;
}
