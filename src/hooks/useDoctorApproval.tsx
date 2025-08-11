import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const useDoctorApproval = () => {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["doctor-approval", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("doctors")
        .select("verification_status")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isApproved = data?.verification_status === "approved";

  return { isApproved, verification_status: data?.verification_status, isLoading, error };
};
