import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";

interface Broadcast {
  id: string;
  title: string;
  message: string;
  cta_label: string | null;
  cta_url: string | null;
}

/**
 * Shows the most recent active admin broadcast to the signed-in user
 * exactly once (dismissal persisted in admin_broadcast_dismissals).
 */
export default function BroadcastPopup() {
  const { user } = useAuth();
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchLatest = async () => {
      const nowIso = new Date().toISOString();
      const { data: latest } = await supabase
        .from("admin_broadcasts")
        .select("id,title,message,cta_label,cta_url,ends_at,starts_at,active")
        .eq("active", true)
        .lte("starts_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!latest || latest.length === 0 || cancelled) return;

      const active = latest.filter((b: any) => !b.ends_at || new Date(b.ends_at) > new Date());
      if (active.length === 0) return;

      const ids = active.map((b: any) => b.id);
      const { data: dismissed } = await supabase
        .from("admin_broadcast_dismissals")
        .select("broadcast_id")
        .in("broadcast_id", ids)
        .eq("user_id", user.id);
      const dismissedIds = new Set((dismissed || []).map((d: any) => d.broadcast_id));
      const next = active.find((b: any) => !dismissedIds.has(b.id));
      if (next && !cancelled) setBroadcast(next as Broadcast);
    };

    fetchLatest();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const dismiss = async () => {
    if (!user || !broadcast) return;
    await supabase
      .from("admin_broadcast_dismissals")
      .insert({ user_id: user.id, broadcast_id: broadcast.id } as any);
    setBroadcast(null);
  };

  if (!broadcast) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && dismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{broadcast.title}</DialogTitle>
          <DialogDescription className="text-center whitespace-pre-line">
            {broadcast.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2">
          {broadcast.cta_label && broadcast.cta_url && (
            <Button
              onClick={() => {
                window.open(broadcast.cta_url!, "_blank", "noopener,noreferrer");
                dismiss();
              }}
            >
              {broadcast.cta_label}
            </Button>
          )}
          <Button variant="outline" onClick={dismiss}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
