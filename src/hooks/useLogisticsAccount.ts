import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LogisticsAccount {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  registration_number: string | null;
  coverage_areas: string | null;
  description: string | null;
  status: string;
  is_active: boolean;
  admin_notes: string | null;
  rating: number;
}

export function useLogisticsAccount() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["my-logistics-company", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logistics_companies")
        .select("*")
        .eq("owner_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as LogisticsAccount) ?? null;
    },
    enabled: !!user?.id,
  });

  return {
    company: query.data ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
    isApproved: query.data?.status === "approved" && !!query.data?.is_active,
  };
}
