import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import WHLayout from "@/components/womens-health/WHLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { motion } from "framer-motion";

interface PartnerRow {
  id: string;
  partner_email: string;
  partner_user_id: string | null;
  status: string;
  can_view_cycle: boolean;
  can_view_symptoms: boolean;
  can_view_pregnancy: boolean;
  created_at?: string;
}

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export default function PartnerAccess() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("women_partner_access")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.warn("partner access load", error);
    setRows((data as PartnerRow[]) ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const invite = async () => {
    if (!user?.id) return;
    const clean = email.trim().toLowerCase();
    if (!emailOk(clean) || clean.length > 255) {
      toast({ title: "Enter a valid email address", variant: "destructive" });
      return;
    }
    if (clean === (user.email ?? "").toLowerCase()) {
      toast({ title: "That's your own email", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("women_partner_access").insert({
      owner_id: user.id,
      partner_email: clean,
      status: "active",
      can_view_cycle: true,
      can_view_symptoms: true,
      can_view_pregnancy: false,
    });
    setSaving(false);
    if (error) {
      toast({
        title: error.message.includes("duplicate")
          ? "This person already has access"
          : "Could not grant access",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setEmail("");
    toast({ title: "Access granted", description: `${clean} can now help track your cycle.` });
    load();
  };

  const toggle = async (row: PartnerRow, field: keyof PartnerRow, value: boolean) => {
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, [field]: value } : x)));
    const { error } = await (supabase as any)
      .from("women_partner_access")
      .update({ [field]: value })
      .eq("id", row.id);
    if (error) {
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
      load();
    }
  };

  const revoke = async (row: PartnerRow) => {
    const { error } = await (supabase as any)
      .from("women_partner_access")
      .delete()
      .eq("id", row.id);
    if (error) {
      toast({ title: "Could not revoke", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Access revoked" });
    load();
  };

  return (
    <WHLayout title="Partner Access">
      <p className="text-sm text-muted-foreground mb-4">
        Invite someone you trust — a partner, husband or friend — to help track your cycle. They'll
        only see exactly what you allow, and you can revoke access at any time.
      </p>

      <Card className="p-5 border-0 shadow-[var(--shadow-wh-card)]">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="h-5 w-5 text-[hsl(var(--wh-pink))]" />
          <p className="font-semibold">Invite by email</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="email"
            inputMode="email"
            maxLength={255}
            placeholder="partner@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && invite()}
          />
          <Button onClick={invite} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Secret chats and your PIN are never shared.
        </p>
      </Card>

      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">People with access</p>
        </div>

        {loading ? (
          <Card className="h-28 animate-pulse border-0" />
        ) : rows.length === 0 ? (
          <Card className="p-6 text-center border-0 shadow-[var(--shadow-wh-card)]">
            <p className="text-sm text-muted-foreground">
              No one has access yet. Your data stays private to you.
            </p>
          </Card>
        ) : (
          rows.map((row, i) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="p-4 border-0 shadow-[var(--shadow-wh-card)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{row.partner_email}</p>
                    <Badge variant="secondary" className="mt-1 text-[11px]">
                      {row.partner_user_id ? "Linked" : "Awaiting sign-up"}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => revoke(row)}
                    aria-label={`Revoke access for ${row.partner_email}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {(
                    [
                      ["can_view_cycle", "Cycle & period dates"],
                      ["can_view_symptoms", "Symptoms & daily logs"],
                      ["can_view_pregnancy", "Pregnancy journey"],
                    ] as [keyof PartnerRow, string][]
                  ).map(([field, label]) => (
                    <div key={String(field)} className="flex items-center justify-between">
                      <span className="text-sm">{label}</span>
                      <Switch
                        checked={Boolean(row[field])}
                        onCheckedChange={(v) => toggle(row, field, v)}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </WHLayout>
  );
}
