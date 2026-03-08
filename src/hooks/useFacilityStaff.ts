import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFacilityStaff() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
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

  return {
    staffRecord: data,
    facilityId: data?.facility_id ?? null,
    isLoading,
    isStaff: !!data,
  };
}
