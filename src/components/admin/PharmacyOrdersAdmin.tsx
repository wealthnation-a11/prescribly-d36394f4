import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Package } from "lucide-react";

const naira = (n: number) => `₦${Number(n || 0).toLocaleString("en-NG")}`;
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");

/** Admin oversight of pharmacy orders, the prescription behind them and the
 *  patient ↔ pharmacy conversation. Read-only. */
export default function PharmacyOrdersAdmin() {
  const [openOrder, setOpenOrder] = useState<any>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-pharmacy-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacy_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = data ?? [];

      const pharmacyIds = Array.from(new Set(rows.map((o: any) => o.pharmacy_id).filter(Boolean)));
      const patientIds = Array.from(new Set(rows.map((o: any) => o.patient_id).filter(Boolean)));
      const rxIds = Array.from(new Set(rows.map((o: any) => o.prescription_id).filter(Boolean)));

      const [ph, pr, rx] = await Promise.all([
        pharmacyIds.length
          ? supabase.from("pharmacies").select("id, name, city").in("id", pharmacyIds)
          : Promise.resolve({ data: [] as any[] }),
        patientIds.length
          ? supabase
              .from("profiles")
              .select("user_id, first_name, last_name, email")
              .in("user_id", patientIds)
          : Promise.resolve({ data: [] as any[] }),
        rxIds.length
          ? supabase
              .from("prescriptions")
              .select("id, medication, dosage, frequency, duration")
              .in("id", rxIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      return rows.map((o: any) => ({
        ...o,
        pharmacy: (ph.data ?? []).find((p: any) => p.id === o.pharmacy_id) ?? null,
        patient: (pr.data ?? []).find((p: any) => p.user_id === o.patient_id) ?? null,
        prescription: (rx.data ?? []).find((r: any) => r.id === o.prescription_id) ?? null,
      }));
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["admin-pharmacy-messages", openOrder?.id],
    enabled: !!openOrder?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacy_messages")
        .select("*")
        .eq("order_id", openOrder.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (openOrder) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setOpenOrder(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="font-semibold truncate">
              {openOrder.pharmacy?.name ?? "Pharmacy"} ·{" "}
              {`${openOrder.patient?.first_name ?? ""} ${openOrder.patient?.last_name ?? ""}`.trim() ||
                "Patient"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Order #{openOrder.id.slice(0, 8)} · {fmt(openOrder.created_at)}
            </p>
          </div>
        </div>

        {openOrder.prescription && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Prescription</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {openOrder.prescription.medication} · {openOrder.prescription.dosage} ·{" "}
              {openOrder.prescription.frequency} · {openOrder.prescription.duration}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Conversation ({messages.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[55vh] overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">No messages on this order.</p>
            )}
            {messages.map((m: any) => (
              <div key={m.id} className="rounded-lg border p-2.5 text-sm">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {m.sender_role} · {fmt(m.created_at)}
                </p>
                {m.content && <p className="mt-0.5">{m.content}</p>}
                {m.image_url && <p className="mt-0.5 text-xs text-muted-foreground">[image attachment]</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isLoading && <p className="text-sm text-muted-foreground">Loading orders…</p>}
      {!isLoading && orders.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No pharmacy orders yet.</p>
      )}
      {orders.map((o: any) => (
        <Card key={o.id}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-primary shrink-0" />
                  {o.pharmacy?.name ?? "Pharmacy"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {`${o.patient?.first_name ?? ""} ${o.patient?.last_name ?? ""}`.trim() || "Patient"} ·{" "}
                  {o.delivery_address}
                </p>
                {o.prescription && (
                  <p className="text-xs text-primary truncate">Rx: {o.prescription.medication}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <Badge variant="secondary" className="capitalize">{o.status}</Badge>
                <p className="font-semibold text-sm mt-1">{naira(o.total_amount)}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="w-full" onClick={() => setOpenOrder(o)}>
              <MessageSquare className="h-4 w-4 mr-1.5" /> View order & conversation
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
