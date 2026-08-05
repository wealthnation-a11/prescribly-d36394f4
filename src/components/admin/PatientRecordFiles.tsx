import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileText, Eye, Trash2, BadgeCheck, Link2 } from "lucide-react";

const CATEGORIES = [
  { value: "lab_result", label: "Lab result" },
  { value: "imaging", label: "Imaging / scan" },
  { value: "prescription", label: "Prescription" },
  { value: "referral", label: "Referral letter" },
  { value: "discharge", label: "Discharge summary" },
  { value: "other", label: "Other" },
];

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");

interface Props {
  patientId: string;
  sessions: any[];
}

export default function PatientRecordFiles({ patientId, sessions }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("lab_result");
  const [sessionId, setSessionId] = useState<string>("none");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["admin-patient-files", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_record_files")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const reset = () => {
    setFile(null);
    setTitle("");
    setNotes("");
    setSessionId("none");
    setCategory("lab_result");
    if (fileRef.current) fileRef.current.value = "";
  };

  const upload = async () => {
    if (!file) return toast.error("Choose a file first");
    if (!title.trim()) return toast.error("Add a title for this record");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${patientId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("patient-records")
        .upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw upErr;

      const { error } = await supabase.from("patient_record_files").insert({
        patient_id: patientId,
        session_id: sessionId === "none" ? null : sessionId,
        title: title.trim(),
        category,
        notes: notes.trim() || null,
        file_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        file_size: file.size,
        uploaded_by: user!.id,
        verified: sessionId !== "none",
      });
      if (error) throw error;

      toast.success("Record uploaded");
      reset();
      qc.invalidateQueries({ queryKey: ["admin-patient-files", patientId] });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const view = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("patient-records")
      .createSignedUrl(path, 3600);
    if (error || !data) return toast.error("Could not open file");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const remove = useMutation({
    mutationFn: async (row: any) => {
      await supabase.storage.from("patient-records").remove([row.file_path]);
      const { error } = await supabase.from("patient_record_files").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Record deleted");
      qc.invalidateQueries({ queryKey: ["admin-patient-files", patientId] });
    },
  });

  const toggleVerify = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase
        .from("patient_record_files")
        .update({ verified: !row.verified })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-patient-files", patientId] }),
  });

  const sessionLabel = (id: string | null) => {
    const s = sessions.find((x) => x.id === id);
    if (!s) return null;
    const when = s.scheduled_at ?? s.started_at ?? s.created_at;
    return `${s.mode ?? "chat"} consult · ${fmt(when)}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-medium flex items-center gap-2 text-sm">
            <Upload className="h-4 w-4 text-primary" /> Upload a health record
          </p>
          <div className="space-y-2">
            <Label className="text-xs">File</Label>
            <Input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-xs">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Malaria test result" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Which consultation produced this record?</Label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked to a consultation</SelectItem>
                {sessions.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.mode ?? "chat"} · {fmt(s.scheduled_at ?? s.created_at)} · {s.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button className="w-full" onClick={upload} disabled={busy}>
            {busy ? "Uploading…" : "Upload record"}
          </Button>
        </CardContent>
      </Card>

      {isLoading && <p className="text-sm text-muted-foreground">Loading files…</p>}
      {!isLoading && files.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No stored records for this patient.</p>
      )}

      <div className="space-y-2">
        {files.map((f: any) => (
          <Card key={f.id}>
            <CardContent className="p-3 space-y-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium flex items-center gap-1.5 truncate">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    {f.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {f.file_name} · {fmt(f.created_at)}
                  </p>
                </div>
                <Badge variant={f.verified ? "default" : "secondary"} className="capitalize shrink-0">
                  {f.verified ? "Verified" : "Unverified"}
                </Badge>
              </div>

              <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" />
                {f.session_id
                  ? sessionLabel(f.session_id) ?? "Linked consultation"
                  : "No consultation linked"}
              </p>
              {f.notes && <p className="text-xs text-muted-foreground">{f.notes}</p>}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => view(f.file_path)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> View
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleVerify.mutate(f)}>
                  <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                  {f.verified ? "Mark unverified" : "Mark verified"}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove.mutate(f)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
