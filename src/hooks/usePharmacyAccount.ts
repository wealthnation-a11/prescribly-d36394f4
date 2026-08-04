import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PharmacyAccount {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  license_number: string | null;
  description: string | null;
  opening_hours: string | null;
  delivery_eta: string | null;
  status: string;
  is_active: boolean;
  admin_notes: string | null;
  rating: number;
  review_count: number;
}

export function usePharmacyAccount() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["my-pharmacy", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacies")
        .select("*")
        .eq("owner_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as PharmacyAccount) ?? null;
    },
    enabled: !!user?.id,
  });

  return {
    pharmacy: query.data ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
    isApproved: query.data?.status === "approved" && !!query.data?.is_active,
  };
}
