import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PregnancyProfile {
  user_id: string;
  lmp_date: string | null;
  due_date: string | null;
  started_at: string;
}

export const usePregnancyProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PregnancyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any).from("pregnancy_profiles").select("*").eq("user_id", user.id).maybeSingle();
    setProfile(data ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = async (patch: Partial<PregnancyProfile>) => {
    if (!user) return;
    const next = { user_id: user.id, ...(profile ?? {}), ...patch };
    await (supabase as any).from("pregnancy_profiles").upsert(next, { onConflict: "user_id" });
    await refresh();
  };

  return { profile, loading, save, refresh };
};
