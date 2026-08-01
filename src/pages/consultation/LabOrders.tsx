import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FlaskConical, CheckCircle2, Circle, Download } from "lucide-react";
import { StepTracker } from "@/components/consultation/StepTracker";
import { CT } from "@/components/consultation/consultationTheme";

const STAGES = ["ordered", "sample_collected", "in_progress", "completed"];
const LABELS: Record<string, string> = {
  ordered: "Test ordered",
  sample_collected: "Sample collected",
  in_progress: "Analysis in progress",
  completed: "Results ready",
};

export default function LabOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const sessionId = params.get("session");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("lab_orders")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 max-w-md w-full mx-auto pb-6">
        <div className="px-5 pt-5">
          <button onClick={() => navigate(-1)} className="mb-3 -ml-1 p-1">
            <ArrowLeft className="w-5 h-5" style={{ color: CT.navy }} />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: CT.navy }}>
            Lab tests
          </h1>
          <p className="text-sm mt-1.5" style={{ color: CT.muted }}>
            Track tests your doctor ordered for you.
          </p>
        </div>

        <div className="px-5 mt-5 space-y-3">
          {loading &&
            [0, 1].map((i) => (
              <div
                key={i}
                className="h-32 rounded-2xl animate-pulse"
                style={{ backgroundColor: CT.gray }}
              />
            ))}

          {!loading && !orders.length && (
            <div
              className="rounded-2xl border p-8 text-center"
              style={{ borderColor: CT.border, backgroundColor: CT.gray }}
            >
              <FlaskConical className="w-10 h-10 mx-auto" style={{ color: CT.muted }} />
              <p className="mt-3 font-semibold" style={{ color: CT.navy }}>
                No lab tests ordered
              </p>
              <p className="text-sm mt-1" style={{ color: CT.muted }}>
                If your doctor orders a test, it will appear here with live status updates.
              </p>
            </div>
          )}

          {orders.map((o) => {
            const idx = STAGES.indexOf(o.status);
            return (
              <div key={o.id} className="rounded-2xl border p-4" style={{ borderColor: CT.border }}>
                <p className="font-semibold" style={{ color: CT.navy }}>
                  {o.test_name}
                </p>
                <div className="mt-3 space-y-3">
                  {STAGES.map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      {i <= idx ? (
                        <CheckCircle2 className="w-4 h-4" style={{ color: CT.green }} />
                      ) : (
                        <Circle className="w-4 h-4" style={{ color: "#CBD5E1" }} />
                      )}
                      <span
                        className="text-sm"
                        style={{ color: i <= idx ? CT.navy : CT.muted }}
                      >
                        {LABELS[s]}
                      </span>
                    </div>
                  ))}
                </div>
                {o.status === "completed" && o.result_url && (
                  <Button
                    variant="outline"
                    className="w-full mt-4 rounded-xl"
                    onClick={() => window.open(o.result_url, "_blank")}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download result
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 mt-6">
          <Button
            className="w-full h-12 rounded-xl"
            style={{ backgroundColor: CT.blue }}
            onClick={() =>
              navigate(`/consultation/record${sessionId ? `?session=${sessionId}` : ""}`)
            }
          >
            View health record
          </Button>
        </div>
      </div>
      <div className="max-w-md w-full mx-auto">
        <StepTracker current="prescription" />
      </div>
    </div>
  );
}
