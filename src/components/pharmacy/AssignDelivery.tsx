import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Truck } from "lucide-react";

interface Props {
  order: any;
  pharmacyId: string;
  pickupAddress?: string | null;
}

interface Company {
  id: string;
  name: string;
  city: string | null;
  coverage_areas: string | null;
}

export default function AssignDelivery({ order, pharmacyId, pickupAddress }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [delivery, setDelivery] = useState<any | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [fee, setFee] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: cs }, { data: d }] = await Promise.all([
      supabase
        .from("logistics_companies")
        .select("id, name, city, coverage_areas")
        .eq("status", "approved")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("delivery_orders")
        .select("*, company:logistics_companies(name, phone)")
        .eq("order_id", order.id)
        .maybeSingle(),
    ]);
    setCompanies((cs ?? []) as unknown as Company[]);
    setDelivery(d ?? null);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const assign = async () => {
    if (!companyId) return toast.error("Choose a logistics company");
    setSaving(true);
    const payload = {
      order_id: order.id,
      pharmacy_id: pharmacyId,
      logistics_company_id: companyId,
      patient_id: order.patient_id,
      pickup_address: pickupAddress ?? null,
      delivery_address: order.delivery_address ?? null,
      recipient_name:
        `${order.patient?.first_name ?? ""} ${order.patient?.last_name ?? ""}`.trim() || null,
      recipient_phone: order.patient?.phone ?? null,
      delivery_fee: Number(fee || 0),
      status: "assigned",
      assigned_at: new Date().toISOString(),
    };
    const { error } = delivery
      ? await supabase
          .from("delivery_orders")
          .update({
            logistics_company_id: companyId,
            delivery_fee: Number(fee || 0),
            status: "assigned",
            assigned_at: new Date().toISOString(),
          })
          .eq("id", delivery.id)
      : await supabase.from("delivery_orders").insert(payload as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Delivery assigned");
    load();
  };

  if (delivery && delivery.logistics_company_id && delivery.status !== "pending") {
    return (
      <div className="rounded-lg border p-3 space-y-1">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium truncate">
            {delivery.company?.name ?? "Logistics partner"}
          </p>
          <Badge variant="secondary" className="ml-auto capitalize">
            {String(delivery.status).replace("_", " ")}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {delivery.rider_name
            ? `Rider: ${delivery.rider_name}${delivery.rider_phone ? ` · ${delivery.rider_phone}` : ""}`
            : "Waiting for a rider to be assigned"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <p className="text-xs font-medium flex items-center gap-2">
        <Truck className="h-4 w-4 text-primary" /> Assign a delivery company
      </p>
      {companies.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No approved logistics partners yet.
        </p>
      ) : (
        <>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.city ? ` · ${c.city}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Delivery fee (₦)"
              inputMode="numeric"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
            <Button size="sm" onClick={assign} disabled={saving}>
              Assign
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
