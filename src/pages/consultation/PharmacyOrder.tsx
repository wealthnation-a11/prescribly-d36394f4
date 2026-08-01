import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle2, Circle, Bike } from "lucide-react";
import RealtimeChat from "@/components/consultation/RealtimeChat";
import { StepTracker } from "@/components/consultation/StepTracker";
import { CT, formatNaira } from "@/components/consultation/consultationTheme";

const STAGES = [
  { key: "placed", label: "Order placed" },
  { key: "confirmed", label: "Pharmacy confirmed" },
  { key: "dispatched", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

export default function PharmacyOrder() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [tab, setTab] = useState<"tracking" | "chat">("tracking");

  useEffect(() => {
    if (!orderId) return;
    const load = async () => {
      const { data } = await supabase
        .from("pharmacy_orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      setOrder(data);
      if (data?.pharmacy_id) {
        const { data: ph } = await supabase
          .from("pharmacies")
          .select("*")
          .eq("id", data.pharmacy_id)
          .maybeSingle();
        setPharmacy(ph);
      }
    };
    load();
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pharmacy_orders", filter: `id=eq.${orderId}` },
        ({ new: row }: any) => setOrder(row),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const activeIndex = Math.max(0, STAGES.findIndex((s) => s.key === order?.status));

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 max-w-md w-full mx-auto flex flex-col min-h-0">
        <div className="px-5 pt-5">
          <button onClick={() => navigate("/prescriptions/pharmacies")} className="mb-3 -ml-1 p-1">
            <ArrowLeft className="w-5 h-5" style={{ color: CT.navy }} />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: CT.navy }}>
            {pharmacy?.name ?? "Your order"}
          </h1>
          <p className="text-sm mt-1" style={{ color: CT.muted }}>
            {order?.delivery_address}
          </p>
        </div>

        <div className="px-5 mt-4 flex gap-2">
          {(["tracking", "chat"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all"
              style={{
                backgroundColor: tab === t ? CT.navy : CT.gray,
                color: tab === t ? "#fff" : CT.muted,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "tracking" ? (
          <div className="px-5 mt-5 space-y-5 animate-fade-in">
            <div className="space-y-4">
              {STAGES.map((s, i) => {
                const done = i <= activeIndex;
                return (
                  <div key={s.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      {done ? (
                        <CheckCircle2 className="w-5 h-5" style={{ color: CT.green }} />
                      ) : (
                        <Circle className="w-5 h-5" style={{ color: "#CBD5E1" }} />
                      )}
                      {i < STAGES.length - 1 && (
                        <span
                          className="w-0.5 h-8"
                          style={{ backgroundColor: i < activeIndex ? CT.green : "#E2E8F0" }}
                        />
                      )}
                    </div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: done ? CT.navy : CT.muted }}
                    >
                      {s.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {order?.rider_name && (
              <div
                className="rounded-2xl border p-4 flex items-center gap-3"
                style={{ borderColor: CT.border }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: CT.blueSoft }}
                >
                  <Bike className="w-5 h-5" style={{ color: CT.blue }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: CT.navy }}>
                    {order.rider_name}
                  </p>
                  <p className="text-xs" style={{ color: CT.muted }}>
                    Your delivery rider
                  </p>
                </div>
              </div>
            )}

            <div
              className="rounded-2xl p-4 flex justify-between font-semibold"
              style={{ backgroundColor: CT.gray, color: CT.navy }}
            >
              <span>Total</span>
              <span>{formatNaira(Number(order?.total_amount ?? 0))}</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 mt-4">
            {orderId && <RealtimeChat kind="pharmacy" parentId={orderId} myRole="patient" />}
          </div>
        )}
      </div>
      <div className="max-w-md w-full mx-auto">
        <StepTracker current="prescription" />
      </div>
    </div>
  );
}
