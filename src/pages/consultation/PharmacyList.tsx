import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Star, Clock, MapPin, PackageCheck, AlertCircle, PackageX } from "lucide-react";
import { StepTracker } from "@/components/consultation/StepTracker";
import { CT, formatNaira } from "@/components/consultation/consultationTheme";

interface Pharmacy {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  rating: number;
  review_count: number;
  delivery_eta: string | null;
  stock_status: string | null;
}

interface InventoryRow {
  pharmacy_id: string;
  drug_name: string;
  unit_price: number;
  quantity_available: number;
  is_available: boolean;
}

interface LineItem {
  name: string;
  price: number;
  inStock: boolean;
  priceKnown: boolean;
}

// TODO: replace with the real delivery-fee service when pharmacy logistics are live.
const DELIVERY_FEE = 1000;

const norm = (s: string) => s.trim().toLowerCase();

export default function PharmacyList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [placing, setPlacing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState<string[]>([]);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: pharms } = await supabase
        .from("pharmacies")
        .select("*")
        .eq("is_active", true)
        .eq("status", "approved")
        .order("rating", { ascending: false });
      const list = (pharms ?? []) as Pharmacy[];
      setPharmacies(list);

      let meds: string[] = [];
      if (user?.id) {
        const { data: rx } = await supabase
          .from("prescriptions")
          .select("id, medication")
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        meds = (rx ?? []).map((r: any) => r.medication as string).filter(Boolean);
        setMedications(meds);
        // Link the order to the most recent prescription so the pharmacy sees
        // exactly what was prescribed.
        setPrescriptionId((rx ?? [])[0]?.id ?? null);
      }

      if (list.length) {
        const { data: inv } = await supabase
          .from("pharmacy_inventory")
          .select("pharmacy_id,drug_name,unit_price,quantity_available,is_available")
          .in(
            "pharmacy_id",
            list.map((p) => p.id)
          );
        setInventory((inv ?? []) as InventoryRow[]);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  // Real availability + pricing per pharmacy, derived from pharmacy_inventory.
  const stockByPharmacy = useMemo(() => {
    const map = new Map<
      string,
      { items: LineItem[]; inStockCount: number; total: number; hasInventory: boolean }
    >();
    for (const p of pharmacies) {
      const rows = inventory.filter((i) => i.pharmacy_id === p.id);
      const hasInventory = rows.length > 0;
      const items: LineItem[] = medications.map((med) => {
        const match = rows.find(
          (r) => norm(r.drug_name) === norm(med) || norm(med).includes(norm(r.drug_name))
        );
        if (!match) {
          // TODO fallback: no inventory record for this drug — price confirmed by the pharmacy.
          return { name: med, price: 0, inStock: false, priceKnown: false };
        }
        return {
          name: med,
          price: Number(match.unit_price) || 0,
          inStock: match.is_available && match.quantity_available > 0,
          priceKnown: Number(match.unit_price) > 0,
        };
      });
      map.set(p.id, {
        items,
        inStockCount: items.filter((i) => i.inStock).length,
        total: items.reduce((s, i) => s + i.price, 0),
        hasInventory,
      });
    }
    return map;
  }, [pharmacies, inventory, medications]);

  const selected = pharmacies.find((p) => p.id === selectedId) ?? null;
  const selectedStock = selectedId ? stockByPharmacy.get(selectedId) : undefined;
  const selectedTotal = (selectedStock?.total ?? 0) + DELIVERY_FEE;
  const pricingUnknown = !!selectedStock?.items.some((i) => !i.priceKnown);

  const placeOrder = async () => {
    if (!user?.id || !selected) return;
    if (!address.trim()) {
      toast.error("Please enter a delivery address");
      return;
    }
    setPlacing(true);
    const { data, error } = await supabase
      .from("pharmacy_orders")
      .insert({
        patient_id: user.id,
        pharmacy_id: selected.id,
        prescription_id: prescriptionId,
        items: (selectedStock?.items ?? []) as any,
        total_amount: selectedTotal,
        delivery_address: address.trim(),
        status: "placed",
      })
      .select("id")
      .single();
    setPlacing(false);
    if (error) {
      console.error(error);
      toast.error("Could not place order");
      return;
    }
    toast.success("Order placed");
    navigate(`/prescriptions/orders/${data.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 max-w-md w-full mx-auto pb-6">
        <div className="px-5 pt-5">
          <button onClick={() => navigate(-1)} className="mb-3 -ml-1 p-1">
            <ArrowLeft className="w-5 h-5" style={{ color: CT.navy }} />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: CT.navy }}>
            Choose a pharmacy
          </h1>
          <p className="text-sm mt-1.5" style={{ color: CT.muted }}>
            {medications.length
              ? `Availability shown for your ${medications.length} prescribed item${medications.length > 1 ? "s" : ""}.`
              : "Partner pharmacies near you, ready to deliver."}
          </p>
        </div>

        <div className="px-5 mt-5 space-y-3">
          {loading &&
            [0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl animate-pulse"
                style={{ backgroundColor: CT.gray }}
              />
            ))}

          {pharmacies.map((p) => {
            const active = selectedId === p.id;
            const stock = stockByPharmacy.get(p.id);
            const total = medications.length;
            const inStock = stock?.inStockCount ?? 0;
            const unknown = !stock?.hasInventory || total === 0;
            const label = unknown
              ? "Confirm on order" // TODO fallback: pharmacy has not published inventory yet
              : inStock === total
                ? "All in stock"
                : inStock === 0
                  ? "Out of stock"
                  : `${inStock}/${total} in stock`;
            const tone = unknown
              ? { bg: "#E0E7FF", fg: "#3730A3", Icon: AlertCircle }
              : inStock === total
                ? { bg: "#DCFCE7", fg: CT.green, Icon: PackageCheck }
                : inStock === 0
                  ? { bg: "#FEE2E2", fg: CT.red, Icon: PackageX }
                  : { bg: "#FEF3C7", fg: "#92400E", Icon: AlertCircle };

            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="w-full text-left rounded-2xl border p-4 transition-all active:scale-[.98]"
                style={{
                  borderColor: active ? CT.blue : CT.border,
                  backgroundColor: active ? CT.blueSoft : "#fff",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold" style={{ color: CT.navy }}>
                      {p.name}
                    </p>
                    <p
                      className="text-xs mt-1 flex items-center gap-1"
                      style={{ color: CT.muted }}
                    >
                      <MapPin className="w-3 h-3" /> {p.address} · {p.city}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="flex items-center gap-1" style={{ color: CT.navy }}>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {Number(p.rating).toFixed(1)} ({p.review_count})
                      </span>
                      <span className="flex items-center gap-1" style={{ color: CT.muted }}>
                        <Clock className="w-3 h-3" /> {p.delivery_eta}
                      </span>
                    </div>
                    {!unknown && (
                      <p className="text-xs mt-2" style={{ color: CT.navy }}>
                        From {formatNaira(stock?.total ?? 0)} + delivery
                      </p>
                    )}
                  </div>
                  <span
                    className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap"
                    style={{ backgroundColor: tone.bg, color: tone.fg }}
                  >
                    <tone.Icon className="w-3 h-3" />
                    {label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="px-5 mt-6 animate-fade-in">
            <div
              className="rounded-2xl border p-4 space-y-2"
              style={{ borderColor: CT.border, backgroundColor: CT.gray }}
            >
              {(selectedStock?.items ?? []).map((i) => (
                <div key={i.name} className="flex justify-between text-sm">
                  <span style={{ color: i.inStock ? CT.text : CT.muted }}>
                    {i.name}
                    {!i.inStock && (
                      <span className="text-[11px] ml-2" style={{ color: CT.red }}>
                        unavailable
                      </span>
                    )}
                  </span>
                  <span style={{ color: CT.navy }}>
                    {i.priceKnown ? formatNaira(i.price) : "Price on confirmation"}
                  </span>
                </div>
              ))}
              {!selectedStock?.items.length && (
                <p className="text-sm" style={{ color: CT.muted }}>
                  No prescription items found yet — the pharmacy will confirm your list.
                </p>
              )}
              <div className="flex justify-between text-sm">
                <span style={{ color: CT.text }}>Delivery</span>
                <span style={{ color: CT.navy }}>{formatNaira(DELIVERY_FEE)}</span>
              </div>
              <div
                className="flex justify-between font-bold pt-2 border-t"
                style={{ borderColor: CT.border, color: CT.navy }}
              >
                <span>{pricingUnknown ? "Estimated total" : "Total"}</span>
                <span>{formatNaira(selectedTotal)}</span>
              </div>
              {pricingUnknown && (
                <p className="text-[11px]" style={{ color: CT.muted }}>
                  Some prices aren't published by this pharmacy yet and will be confirmed before
                  dispatch.
                </p>
              )}
            </div>

            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Delivery address"
              className="mt-3 rounded-xl h-12"
            />

            <Button
              className="w-full h-12 rounded-xl mt-3"
              style={{ backgroundColor: CT.blue }}
              disabled={placing}
              onClick={placeOrder}
            >
              {placing ? "Placing order..." : "Place order"}
            </Button>
          </div>
        )}
      </div>
      <div className="max-w-md w-full mx-auto">
        <StepTracker current="prescription" />
      </div>
    </div>
  );
}
