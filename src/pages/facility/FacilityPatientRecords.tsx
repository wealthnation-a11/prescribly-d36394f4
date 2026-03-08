import { useState } from "react";
import { FacilityLayout } from "@/components/FacilityLayout";
import { useFacilityStaff } from "@/hooks/useFacilityStaff";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { FileText, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useAuth } from "@/contexts/AuthContext";

const FacilityPatientRecords = () => {
  const { facilityId } = useFacilityStaff();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRecord, setNewRecord] = useState({
    patient_code: "", diagnosis: "", treatment_notes: "", vitals: "", follow_up_date: "",
  });

  usePageSEO({ title: "Patient Records - Facility Portal", description: "View and manage patient visit records" });

  const { data: records, isLoading, refetch } = useQuery({
    queryKey: ["facility-patient-records", facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_patient_records")
        .select("*")
        .eq("facility_id", facilityId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!facilityId,
  });

  const handleAddRecord = async () => {
    if (!facilityId || !user) return;

    // Look up patient from registration code
    const trimmed = newRecord.patient_code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      toast({ title: "Invalid code", description: "Enter a valid 6-character code", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: codeData, error: codeError } = await supabase.rpc("verify_registration_code", { _code: trimmed });
      if (codeError) throw codeError;
      if (!codeData || codeData.length === 0) {
        toast({ title: "Code not found", variant: "destructive" });
        return;
      }

      const record = codeData[0];
      if (record.facility_id !== facilityId) {
        toast({ title: "Wrong facility", description: "This code belongs to a different facility", variant: "destructive" });
        return;
      }

      let vitalsJson = null;
      if (newRecord.vitals.trim()) {
        try { vitalsJson = JSON.parse(newRecord.vitals); } catch {
          vitalsJson = { notes: newRecord.vitals };
        }
      }

      const { error } = await supabase.from("facility_patient_records").insert({
        facility_id: facilityId,
        patient_id: record.patient_id,
        registration_code_id: record.id,
        diagnosis: newRecord.diagnosis || null,
        treatment_notes: newRecord.treatment_notes || null,
        vitals: vitalsJson,
        follow_up_date: newRecord.follow_up_date || null,
        created_by: user.id,
      });
      if (error) throw error;

      toast({ title: "Record saved!" });
      setAddOpen(false);
      setNewRecord({ patient_code: "", diagnosis: "", treatment_notes: "", vitals: "", follow_up_date: "" });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filtered = records?.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.diagnosis?.toLowerCase().includes(s) || r.treatment_notes?.toLowerCase().includes(s);
  });

  return (
    <FacilityLayout>
      <div className="container mx-auto p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Patient Records</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage patient visit records for your facility</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Record</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  New Patient Record
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Patient Code *</Label>
                  <Input
                    value={newRecord.patient_code}
                    onChange={(e) => setNewRecord((p) => ({ ...p, patient_code: e.target.value.toUpperCase().slice(0, 6) }))}
                    placeholder="6-character code"
                    className="text-center font-mono tracking-widest uppercase"
                    maxLength={6}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Diagnosis</Label>
                  <Input value={newRecord.diagnosis} onChange={(e) => setNewRecord((p) => ({ ...p, diagnosis: e.target.value }))} placeholder="e.g. Malaria, Typhoid" />
                </div>
                <div className="space-y-1.5">
                  <Label>Treatment Notes</Label>
                  <Textarea value={newRecord.treatment_notes} onChange={(e) => setNewRecord((p) => ({ ...p, treatment_notes: e.target.value }))} placeholder="Treatment details..." rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label>Vitals</Label>
                  <Input value={newRecord.vitals} onChange={(e) => setNewRecord((p) => ({ ...p, vitals: e.target.value }))} placeholder="e.g. BP: 120/80, Temp: 37°C" />
                </div>
                <div className="space-y-1.5">
                  <Label>Follow-up Date</Label>
                  <Input type="date" value={newRecord.follow_up_date} onChange={(e) => setNewRecord((p) => ({ ...p, follow_up_date: e.target.value }))} />
                </div>
                <Button onClick={handleAddRecord} disabled={saving} className="w-full">
                  {saving ? "Saving..." : "Save Record"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search records..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filtered && filtered.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Treatment</TableHead>
                    <TableHead>Vitals</TableHead>
                    <TableHead>Follow-up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="text-sm">{format(new Date(rec.created_at), "PP")}</TableCell>
                      <TableCell className="text-sm">{rec.diagnosis || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{rec.treatment_notes || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm">
                        {rec.vitals ? (
                          <Badge variant="outline" className="text-xs">
                            {typeof rec.vitals === "object" && (rec.vitals as any).notes ? (rec.vitals as any).notes : "Recorded"}
                          </Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">{rec.follow_up_date ? format(new Date(rec.follow_up_date), "PP") : <span className="text-muted-foreground">—</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No patient records yet</p>
                <p className="text-sm mt-1">Add a record after verifying a patient's code</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FacilityLayout>
  );
};

export default FacilityPatientRecords;
