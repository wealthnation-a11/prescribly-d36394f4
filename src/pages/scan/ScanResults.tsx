import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { ArrowLeft, Camera, FileUp, Loader2, ScanLine, ChevronRight, ShieldCheck } from "lucide-react";

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  processing: { label: "Analysing", variant: "secondary" },
  unpaid: { label: "Ready · Unlock", variant: "outline" },
  paid: { label: "Unlocked", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

export default function ScanResults() {
  usePageSEO({ title: "Scan Lab Results - Prescribly", description: "Upload your lab result and get it explained in plain English." });
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"" | "upload" | "analyse">("");

  const { data: scans = [], refetch } = useQuery({
    queryKey: ["my-scans", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("medical_result_scans")
        .select("id,file_name,status,findings_count,flagged_count,created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const handleFile = async (file?: File) => {
    if (!file || !user) return;
    if (!/^image\/|application\/pdf/.test(file.type)) return toast.error("Upload a photo or PDF of your result");
    if (file.size > 10 * 1024 * 1024) return toast.error("File must be under 10MB");
    try {
      setBusy("upload");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/scans/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("patient-records").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      setBusy("analyse");
      const { data, error } = await supabase.functions.invoke("analyze-medical-scan", {
        body: { file_path: path, file_name: file.name },
      });
      if (error || data?.error) {
        let msg = data?.error;
        try { msg = msg || (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
        refetch();
        throw new Error(msg || "Could not analyse this result");
      }
      navigate(`/scan-results/${data.scan_id}`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <Logo size="sm" withLink />
          <span className="font-semibold">Scan Lab Results</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <Card className="overflow-hidden">
          <CardContent className="pt-6 space-y-4 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              {busy ? <Loader2 className="h-8 w-8 text-primary animate-spin" /> : <ScanLine className="h-8 w-8 text-primary" />}
            </div>
            <div>
              <h1 className="text-xl font-bold">
                {busy === "upload" ? "Uploading your result…" : busy === "analyse" ? "Reading your result…" : "Understand your lab result"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {busy === "analyse"
                  ? "This can take up to a minute. Please keep this page open."
                  : "Take a photo or upload a PDF. We'll explain every value in plain English."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" disabled={!!busy} onClick={() => camRef.current?.click()}>
                <Camera className="h-4 w-4 mr-2" />Take photo
              </Button>
              <Button size="lg" variant="outline" disabled={!!busy} onClick={() => fileRef.current?.click()}>
                <FileUp className="h-4 w-4 mr-2" />Upload file
              </Button>
            </div>
            <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
            <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Private to you · Full report ₦4,500
            </p>
          </CardContent>
        </Card>

        {scans.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Your results</h2>
            {scans.map((s: any) => (
              <button key={s.id} onClick={() => navigate(`/scan-results/${s.id}`)} className="w-full text-left">
                <Card className="hover:bg-muted/40 transition-colors">
                  <CardContent className="py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.file_name || "Lab result"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()} · {s.findings_count ?? 0} items
                      </p>
                    </div>
                    <Badge variant={STATUS[s.status]?.variant ?? "secondary"}>{STATUS[s.status]?.label ?? s.status}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </button>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
