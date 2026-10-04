import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { ArrowLeft, Lock, Loader2, Download, Share2, MessageCircle, Stethoscope, AlertTriangle, CheckCircle2 } from "lucide-react";

type Finding = { name: string; value: string; reference_range: string; status: string; explanation: string };
type Report = {
  test_type: string; overall_status: string; summary: string; findings: Finding[];
  next_steps: string[]; questions_for_doctor: string[]; lifestyle_tips: string[];
};

const OVERALL: Record<string, string> = {
  normal: "Looks normal", mild_concern: "Mild concern", needs_attention: "Needs attention",
};

export default function ScanResultDetail() {
  usePageSEO({ title: "Your Lab Result - Prescribly", description: "Your lab result explained in plain English." });
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState<any>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const verified = useRef(false);

  const load = async () => {
    const { data } = await supabase
      .from("medical_result_scans")
      .select("id,file_name,status,summary_teaser,findings_count,flagged_count,error_message,created_at,paid_at")
      .eq("id", id!)
      .maybeSingle();
    setScan(data);
    if (data?.status === "paid") {
      const { data: r } = await (supabase.rpc as any)("get_scan_report", { _scan_id: id });
      setReport(r as Report);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  // Returning from Flutterwave
  useEffect(() => {
    const tx = params.get("transaction_id");
    const st = params.get("status");
    if (!tx || verified.current) return;
    verified.current = true;
    if (st && !["successful", "completed"].includes(st)) {
      toast.error("Payment was not completed");
      setParams({});
      return;
    }
    (async () => {
      setVerifying(true);
      const { data, error } = await supabase.functions.invoke("scan-payment", {
        body: { action: "verify", scan_id: id, transaction_id: tx },
      });
      setVerifying(false);
      setParams({});
      if (error || data?.error) return toast.error(data?.error || "We couldn't confirm your payment yet. Contact support if you were charged.");
      toast.success("Payment confirmed — your result is unlocked");
      load();
    })();
    // eslint-disable-next-line
  }, [params]);

  const pay = async () => {
    setPaying(true);
    const { data, error } = await supabase.functions.invoke("scan-payment", { body: { action: "init", scan_id: id } });
    if (error || !data?.link) {
      setPaying(false);
      return toast.error(data?.error || "Could not start payment");
    }
    window.location.href = data.link;
  };

  const textSummary = () => {
    if (!report) return "";
    const lines = [
      `Prescribly Lab Result — ${report.test_type}`,
      `Overall: ${OVERALL[report.overall_status] ?? report.overall_status}`,
      "",
      report.summary,
      "",
      ...report.findings.map((f) => `• ${f.name}: ${f.value} (${f.status}) — ${f.explanation}`),
      "",
      "Next steps:",
      ...report.next_steps.map((s) => `- ${s}`),
      "",
      "This explanation is for education only and does not replace a doctor.",
    ];
    return lines.join("\n");
  };

  const buildPdf = () => {
    if (!report) return null;
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    let y = 18;
    const line = (t: string, size = 10, bold = false) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      for (const l of doc.splitTextToSize(t, W - 28)) {
        if (y > 280) { doc.addPage(); y = 18; }
        doc.text(l, 14, y);
        y += size * 0.5;
      }
      y += 2;
    };
    line("Prescribly", 18, true);
    line("Lab Result Interpretation", 12, true);
    line(`${report.test_type} · ${new Date(scan?.created_at).toLocaleDateString()}`, 9);
    line(`Overall: ${OVERALL[report.overall_status] ?? report.overall_status}`, 11, true);
    line(report.summary);
    line("Results", 12, true);
    report.findings.forEach((f) => {
      line(`${f.name}: ${f.value}  (normal: ${f.reference_range || "—"})  [${f.status.toUpperCase()}]`, 10, true);
      line(f.explanation, 9);
    });
    if (report.next_steps?.length) { line("Next steps", 12, true); report.next_steps.forEach((s) => line(`• ${s}`)); }
    if (report.questions_for_doctor?.length) { line("Questions for your doctor", 12, true); report.questions_for_doctor.forEach((s) => line(`• ${s}`)); }
    if (report.lifestyle_tips?.length) { line("Healthy habits", 12, true); report.lifestyle_tips.forEach((s) => line(`• ${s}`)); }
    line("This explanation is for education only and does not replace diagnosis by a licensed doctor. Book a doctor on Prescribly for treatment.", 8);
    return doc;
  };

  const download = () => buildPdf()?.save(`prescribly-lab-result-${id?.slice(0, 8)}.pdf`);

  const share = async () => {
    const doc = buildPdf();
    if (!doc) return;
    const file = new File([doc.output("blob")], "prescribly-lab-result.pdf", { type: "application/pdf" });
    const nav = navigator as any;
    if (nav.canShare?.({ files: [file] })) {
      try { await nav.share({ files: [file], title: "My lab result", text: "My Prescribly lab result" }); } catch { /* cancelled */ }
    } else if (nav.share) {
      try { await nav.share({ title: "My lab result", text: textSummary() }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(textSummary());
      toast.success("Summary copied — paste it anywhere");
    }
  };

  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(textSummary())}`, "_blank");

  const Header = (
    <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
      <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/scan-results")}><ArrowLeft className="h-4 w-4" /></Button>
        <Logo size="sm" withLink />
        <span className="font-semibold truncate">Lab Result</span>
      </div>
    </header>
  );

  if (!scan || verifying) {
    return (
      <div className="min-h-screen bg-background">{Header}
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          {verifying && <p className="text-sm">Confirming your payment…</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {Header}
      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {scan.status === "failed" && (
          <Card><CardContent className="pt-6 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
            <p className="font-medium">{scan.error_message || "We couldn't read this result."}</p>
            <Button onClick={() => navigate("/scan-results")}>Try another upload</Button>
          </CardContent></Card>
        )}

        {scan.status === "processing" && (
          <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground">Still analysing… refresh in a moment.</CardContent></Card>
        )}

        {scan.status === "unpaid" && (
          <>
            <Card>
              <CardContent className="pt-6 space-y-2">
                <Badge variant="outline">Analysis ready</Badge>
                <p className="text-lg font-semibold">
                  {scan.findings_count} results found{scan.flagged_count ? `, ${scan.flagged_count} need a closer look` : ""}
                </p>
                <p className="text-sm text-muted-foreground">{scan.summary_teaser}</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden">
              <CardContent className="pt-6 space-y-3 blur-sm select-none pointer-events-none" aria-hidden>
                {Array.from({ length: Math.min(4, scan.findings_count || 3) }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-4 w-1/2 rounded bg-muted" />
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-3/4 rounded bg-muted" />
                  </div>
                ))}
              </CardContent>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 p-6 text-center">
                <Lock className="h-8 w-8 text-primary" />
                <p className="font-semibold">Unlock your full explanation</p>
                <p className="text-xs text-muted-foreground">Every value explained, what's high or low, next steps and questions for your doctor.</p>
                <Button size="lg" onClick={pay} disabled={paying}>
                  {paying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Pay ₦4,500 to unlock
                </Button>
              </div>
            </Card>
          </>
        )}

        {scan.status === "paid" && report && (
          <>
            <Card>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={report.overall_status === "normal" ? "default" : report.overall_status === "needs_attention" ? "destructive" : "secondary"}>
                    {OVERALL[report.overall_status] ?? report.overall_status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{report.test_type}</span>
                </div>
                <p className="text-sm leading-relaxed">{report.summary}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={download}><Download className="h-4 w-4 mr-1" />PDF</Button>
              <Button variant="outline" onClick={whatsapp}><MessageCircle className="h-4 w-4 mr-1" />WhatsApp</Button>
              <Button variant="outline" onClick={share}><Share2 className="h-4 w-4 mr-1" />Share</Button>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Your results</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {report.findings.map((f, i) => {
                  const ok = f.status === "normal";
                  return (
                    <div key={i} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        {ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                        <p className="font-medium text-sm flex-1">{f.name}</p>
                        <Badge variant={ok ? "secondary" : "destructive"} className="capitalize">{f.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Your value: <b>{f.value}</b>{f.reference_range ? ` · Normal: ${f.reference_range}` : ""}</p>
                      <p className="text-sm">{f.explanation}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {[["What to do next", report.next_steps], ["Questions to ask your doctor", report.questions_for_doctor], ["Healthy habits", report.lifestyle_tips]].map(([t, items]) =>
              (items as string[])?.length ? (
                <Card key={t as string}>
                  <CardHeader className="pb-2"><CardTitle className="text-base">{t as string}</CardTitle></CardHeader>
                  <CardContent><ul className="list-disc pl-5 space-y-1 text-sm">{(items as string[]).map((s, i) => <li key={i}>{s}</li>)}</ul></CardContent>
                </Card>
              ) : null
            )}

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 space-y-3">
                <p className="text-sm">This explanation helps you understand your result. It does not replace a doctor's diagnosis.</p>
                <Button className="w-full" onClick={() => navigate("/consultation/start")}>
                  <Stethoscope className="h-4 w-4 mr-2" />Talk to a doctor (₦3,500)
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
