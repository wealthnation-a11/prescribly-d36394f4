import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface WomenProfile {
  user_id: string;
  mode: "cycle" | "pregnancy";
  height_cm: number | null;
  weight_kg: number | null;
  avg_cycle_length: number;
  avg_period_length: number;
  last_period_start: string | null;
  due_date: string | null;
  lmp_date: string | null;
  notifications_enabled: boolean;
  language: string | null;
}

const TABLE = "women_profiles" as const;

export const useWomensProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<WomenProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any).from(TABLE).select("*").eq("user_id", user.id).maybeSingle();
    if (error) console.warn("women_profiles load", error);
    setProfile(data ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = async (patch: Partial<WomenProfile>) => {
    if (!user) return;
    const next = { user_id: user.id, mode: "cycle", avg_cycle_length: 28, avg_period_length: 5, notifications_enabled: true, ...(profile ?? {}), ...patch };
    const { error } = await (supabase as any).from(TABLE).upsert(next, { onConflict: "user_id" });
    if (error) { toast({ title: "Could not save", description: error.message, variant: "destructive" }); return; }
    await refresh();
  };

  return { profile, loading, save, refresh };
};
