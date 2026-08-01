import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import jsPDF from "jspdf";
import {
  ArrowLeft,
  Download,
  Pill,
  ShoppingBag,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";
import { StepTracker } from "@/components/consultation/StepTracker";
import { CT } from "@/components/consultation/consultationTheme";

interface Rx {
  id: string;
  medication: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  created_at: string;
  doctor_id: string | null;
}

export default function PrescriptionResult() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const sessionId = params.get("session");
  const [items, setItems] = useState<Rx[]>([]);
  const [doctorName, setDoctorName] = useState("Your doctor");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("prescriptions")
        .select("id,medication,dosage,frequency,duration,instructions,created_at,doctor_id")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setItems((data ?? []) as Rx[]);
      const docId = data?.[0]?.doctor_id;
      if (docId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name,last_name")
          .eq("user_id", docId)
          .maybeSingle();
        if (prof) setDoctorName(`Dr. ${prof.first_name ?? ""} ${prof.last_name ?? ""}`.trim());
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const downloadPdf = () => {
    if (!items.length) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Prescribly — Prescription", 14, 20);
    doc.setFontSize(11);
    doc.text(`Issued by: ${doctorName}`, 14, 30);
    doc.text(`Date: ${new Date(items[0].created_at).toLocaleDateString()}`, 14, 37);
    let y = 50;
    items.forEach((it, i) => {
      doc.setFont(undefined, "bold");
      doc.text(`${i + 1}. ${it.medication}`, 14, y);
      doc.setFont(undefined, "normal");
      y += 7;
      doc.text(`Dosage: ${it.dosage ?? "-"}   Frequency: ${it.frequency ?? "-"}`, 18, y);
      y += 6;
      doc.text(`Duration: ${it.duration ?? "-"}`, 18, y);
      y += 6;
      if (it.instructions) {
        doc.text(`Instructions: ${it.instructions}`, 18, y, { maxWidth: 170 });
        y += 8;
      }
      y += 6;
    });
    doc.save("prescribly-prescription.pdf");
    toast.success("Prescription downloaded");
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 max-w-md w-full mx-auto pb-6">
        <div className="px-5 pt-5">
          <button onClick={() => navigate("/dashboard")} className="mb-3 -ml-1 p-1">
            <ArrowLeft className="w-5 h-5" style={{ color: CT.navy }} />
          </button>
          <h1 className="text-2xl font-bold" style={{ color: CT.navy }}>
            Your prescription
          </h1>
          <p className="text-sm mt-1.5" style={{ color: CT.muted }}>
            Issued by {doctorName}
          </p>
        </div>

        <div className="px-5 mt-5 space-y-3">
          {loading && (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: CT.gray }} />
              ))}
            </div>
          )}

          {!loading && !items.length && (
            <div
              className="rounded-2xl border p-8 text-center"
              style={{ borderColor: CT.border, backgroundColor: CT.gray }}
            >
              <Pill className="w-10 h-10 mx-auto" style={{ color: CT.muted }} />
              <p className="mt-3 font-semibold" style={{ color: CT.navy }}>
                No prescription yet
              </p>
              <p className="text-sm mt-1" style={{ color: CT.muted }}>
                Your doctor will send one here after reviewing your consultation.
              </p>
            </div>
          )}

          {items.map((it) => (
            <div
              key={it.id}
              className="rounded-2xl border p-4"
              style={{ borderColor: CT.border }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: CT.blueSoft }}
                >
                  <Pill className="w-5 h-5" style={{ color: CT.blue }} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold" style={{ color: CT.navy }}>
                    {it.medication}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: CT.muted }}>
                    {[it.dosage, it.frequency, it.duration].filter(Boolean).join(" · ")}
                  </p>
                  {it.instructions && (
                    <p
                      className="text-xs mt-2 rounded-lg px-3 py-2"
                      style={{ backgroundColor: CT.gray, color: CT.text }}
                    >
                      {it.instructions}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 mt-6 space-y-3">
          <Button
            className="w-full h-12 rounded-xl"
            style={{ backgroundColor: CT.blue }}
            disabled={!items.length}
            onClick={() => navigate("/prescriptions/pharmacies")}
          >
            <ShoppingBag className="w-4 h-4 mr-2" /> Order from pharmacy
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl"
            disabled={!items.length}
            onClick={downloadPdf}
          >
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl"
            onClick={() => navigate(`/consultation/labs${sessionId ? `?session=${sessionId}` : ""}`)}
          >
            <FlaskConical className="w-4 h-4 mr-2" /> Lab tests ordered
          </Button>
          <p
            className="text-center text-xs flex items-center justify-center gap-1.5 pt-1"
            style={{ color: CT.muted }}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Digitally signed and verified
          </p>
        </div>
      </div>
      <div className="max-w-md w-full mx-auto">
        <StepTracker current="prescription" />
      </div>
    </div>
  );
}
