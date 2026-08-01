import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Stethoscope, Pill, FlaskConical, MessageSquare, Video, Phone } from "lucide-react";
import { StepTracker } from "@/components/consultation/StepTracker";
import { CT, formatNaira } from "@/components/consultation/consultationTheme";

export default function ConsultationRecord() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [rx, setRx] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [s, p, l] = await Promise.all([
        supabase
          .from("consultation_sessions")
          .select("*")
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("prescriptions")
          .select("*")
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("lab_orders")
          .select("*")
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setSessions(s.data ?? []);
      setRx(p.data ?? []);
      setLabs(l.data ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  const modeIcon = (m: string) =>
    m === "video" ? Video : m === "voice" ? Phone : MessageSquare;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 max-w-md w-full mx-auto pb-6">
        <div className="px-5 pt-5">
          <button onClick={() => navigate("/dashboard")} className="mb-3 -ml-1 p-1">
            <ArrowLeft className="w-5 h-5" style={{ color: CT.navy }} />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: CT.navy }}>
            Health record
          </h1>
          <p className="text-sm mt-1.5" style={{ color: CT.muted }}>
            Everything from your consultations in one place.
          </p>
        </div>

        {loading ? (
          <div className="px-5 mt-5 space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl animate-pulse"
                style={{ backgroundColor: CT.gray }}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 mt-5 space-y-6">
            <section>
              <p className="text-sm font-semibold mb-2" style={{ color: CT.navy }}>
                Consultations
              </p>
              {!sessions.length && (
                <p className="text-sm" style={{ color: CT.muted }}>
                  No consultations yet.
                </p>
              )}
              <div className="space-y-2">
                {sessions.map((s) => {
                  const Icon = modeIcon(s.mode);
                  return (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/consultation/${s.id}/live`)}
                      className="w-full text-left rounded-2xl border p-4 flex items-start gap-3"
                      style={{ borderColor: CT.border }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: CT.blueSoft }}
                      >
                        <Icon className="w-5 h-5" style={{ color: CT.blue }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm" style={{ color: CT.navy }}>
                          {s.symptoms || "Consultation"}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: CT.muted }}>
                          {new Date(s.created_at).toLocaleDateString()} ·{" "}
                          {formatNaira(Number(s.fee))} · {s.status}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <p className="text-sm font-semibold mb-2" style={{ color: CT.navy }}>
                Prescriptions
              </p>
              {!rx.length && (
                <p className="text-sm" style={{ color: CT.muted }}>
                  No prescriptions yet.
                </p>
              )}
              <div className="space-y-2">
                {rx.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border p-4 flex items-center gap-3"
                    style={{ borderColor: CT.border }}
                  >
                    <Pill className="w-5 h-5" style={{ color: CT.blue }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: CT.navy }}>
                        {r.medication}
                      </p>
                      <p className="text-xs" style={{ color: CT.muted }}>
                        {[r.dosage, r.frequency].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="text-sm font-semibold mb-2" style={{ color: CT.navy }}>
                Lab tests
              </p>
              {!labs.length && (
                <p className="text-sm" style={{ color: CT.muted }}>
                  No lab tests yet.
                </p>
              )}
              <div className="space-y-2">
                {labs.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-2xl border p-4 flex items-center gap-3"
                    style={{ borderColor: CT.border }}
                  >
                    <FlaskConical className="w-5 h-5" style={{ color: CT.blue }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: CT.navy }}>
                        {l.test_name}
                      </p>
                      <p className="text-xs" style={{ color: CT.muted }}>
                        {l.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Button
              className="w-full h-12 rounded-xl"
              style={{ backgroundColor: CT.blue }}
              onClick={() => navigate("/consultation")}
            >
              <Stethoscope className="w-4 h-4 mr-2" /> Start a new consultation
            </Button>
          </div>
        )}
      </div>
      <div className="max-w-md w-full mx-auto">
        <StepTracker current="record" />
      </div>
    </div>
  );
}
