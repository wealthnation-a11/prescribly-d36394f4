import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Star, Clock, MapPin, PackageCheck, AlertCircle } from "lucide-react";
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

export default function PharmacyList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selected, setSelected] = useState<Pharmacy | null>(null);
  const [address, setAddress] = useState("");
  const [placing, setPlacing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rxTotal, setRxTotal] = useState(0);
  const [items, setItems] = useState<{ name: string; price: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pharmacies")
        .select("*")
        .eq("is_active", true)
        .order("rating", { ascending: false });
      setPharmacies((data ?? []) as Pharmacy[]);

      if (user?.id) {
        const { data: rx } = await supabase
          .from("prescriptions")
          .select("medication")
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        const list = (rx ?? []).map((r: any) => ({ name: r.medication as string, price: 2500 }));
        setItems(list);
        setRxTotal(list.reduce((s, i) => s + i.price, 0));
      }
      setLoading(false);
    })();
  }, [user?.id]);

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
        items: items as any,
        total_amount: rxTotal + 1000,
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
            Partner pharmacies near you, ready to deliver.
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
            const active = selected?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="w-full text-left rounded-2xl border p-4 transition-all active:scale-[.98]"
                style={{
                  borderColor: active ? CT.blue : CT.border,
                  backgroundColor: active ? CT.blueSoft : "#fff",
                }}
              >
                <div className="flex items-start justify-between">
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
                  </div>
                  <span
                    className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                    style={{
                      backgroundColor: p.stock_status === "full" ? "#DCFCE7" : "#FEF3C7",
                      color: p.stock_status === "full" ? CT.green : "#92400E",
                    }}
                  >
                    {p.stock_status === "full" ? (
                      <PackageCheck className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {p.stock_status === "full" ? "All in stock" : "Partial stock"}
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
              {items.map((i) => (
                <div key={i.name} className="flex justify-between text-sm">
                  <span style={{ color: CT.text }}>{i.name}</span>
                  <span style={{ color: CT.navy }}>{formatNaira(i.price)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm">
                <span style={{ color: CT.text }}>Delivery</span>
                <span style={{ color: CT.navy }}>{formatNaira(1000)}</span>
              </div>
              <div
                className="flex justify-between font-bold pt-2 border-t"
                style={{ borderColor: CT.border, color: CT.navy }}
              >
                <span>Total</span>
                <span>{formatNaira(rxTotal + 1000)}</span>
              </div>
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
