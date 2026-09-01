import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const useDoctorApproval = () => {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["doctor-approval", user?.id],
    enabled: !!user?.id,
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user?.id) return null;
      // maybeSingle: a doctor without a doctors row must not throw — it simply
      // has no approval yet, otherwise the guard loops on an error state.
      const { data, error } = await supabase
        .from("doctors")
        .select("verification_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Doctor approval lookup failed:", error);
        return null;
      }
      return data;
    },
  });

  const isApproved = data?.verification_status === "approved";

  return {
    isApproved,
    verification_status: data?.verification_status ?? null,
    isLoading,
    error,
  };
};
