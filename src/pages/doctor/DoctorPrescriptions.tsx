import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Pill, ClipboardEdit, AlertCircle } from "lucide-react";

type Appointment = {
  id: string;
  patient_id: string;
  scheduled_time: string;
};

type Prescription = {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  diagnosis: string | null;
  instructions: string | null;
  issued_at: string;
};

export const DoctorPrescriptions = () => {
  const { user } = useAuth();
  const { role, isDoctor, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("");
  const selectedAppointment = useMemo(
    () => appointments.find((a) => a.id === selectedAppointmentId),
    [appointments, selectedAppointmentId]
  );
  const [diagnosis, setDiagnosis] = useState("");
  const [prescriptionText, setPrescriptionText] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);

      // Past appointments for this doctor
      const { data: appts, error: apptErr } = await supabase
        .from("appointments")
        .select("id, patient_id, scheduled_time")
        .eq("doctor_id", user.id)
        .order("scheduled_time", { ascending: false });

      if (apptErr) {
        console.error(apptErr);
      } else {
        setAppointments((appts as any) || []);
      }

      // Existing prescriptions by this doctor
      const { data: presc, error: prescErr } = await supabase
        .from("prescriptions")
        .select("id, patient_id, appointment_id, diagnosis, instructions, issued_at")
        .eq("doctor_id", user.id)
        .order("issued_at", { ascending: false });

      if (prescErr) {
        console.error(prescErr);
      } else {
        setPrescriptions((presc as any) || []);
      }

      setLoading(false);
    };

    load();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selectedAppointment) {
      toast({ title: "Select an appointment first", variant: "destructive" });
      return;
    }
    if (!diagnosis.trim() || !prescriptionText.trim()) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      doctor_id: user.id,
      patient_id: selectedAppointment.patient_id,
      appointment_id: selectedAppointment.id,
      diagnosis,
      instructions: prescriptionText,
      // medications is NOT NULL in existing schema; send empty array as default structure
      medications: [] as any,
    };

    const { error } = await supabase.from("prescriptions").insert(payload);
    setSaving(false);

    if (error) {
      console.error(error);
      toast({ title: "Failed to create prescription", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Prescription successfully created" });
    setDiagnosis("");
    setPrescriptionText("");
    setSelectedAppointmentId("");

    // refresh list
    const { data: presc } = await supabase
      .from("prescriptions")
      .select("id, patient_id, appointment_id, diagnosis, instructions, issued_at")
      .eq("doctor_id", user.id)
      .order("issued_at", { ascending: false });
    setPrescriptions((presc as any) || []);
  };

  if (roleLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!isDoctor) {
    return <Navigate to="/doctor-login" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Write Prescription</h1>
        <p className="text-slate-600">Create and manage prescriptions for your patients</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardEdit className="w-5 h-5 text-primary" />
            New Prescription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Appointment / Patient</Label>
                <Select value={selectedAppointmentId} onValueChange={setSelectedAppointmentId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an appointment" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {appointments.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No appointments found</div>
                    )}
                    {appointments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {new Date(a.scheduled_time).toLocaleString()} · {a.patient_id.slice(0, 6)}…
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Diagnosis</Label>
                <Input
                  placeholder="e.g., Acute pharyngitis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prescription Text</Label>
              <Textarea
                placeholder="e.g., Amoxicillin 500mg, take one capsule every 8 hours for 7 days."
                value={prescriptionText}
                onChange={(e) => setPrescriptionText(e.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Prescription"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-blue-600" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{prescriptions.length}</p>
            <p className="text-sm text-slate-600">prescriptions written</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pill className="w-5 h-5 text-green-600" />
              Recent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Math.min(10, prescriptions.length)}</p>
            <p className="text-sm text-slate-600">in the last 10 entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Tip
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">Provide clear dosage and duration in the prescription text.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Previous Prescriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-slate-600">Loading...</div>
          ) : prescriptions.length === 0 ? (
            <div className="text-slate-600">No prescriptions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescriptions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.issued_at ?? Date.now()).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{p.patient_id?.slice(0, 8)}…</TableCell>
                      <TableCell className="truncate max-w-[240px]">{p.diagnosis || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">View Full Prescription</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Prescription Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2">
                              <div className="text-sm text-muted-foreground">Patient: {p.patient_id?.slice(0, 8)}…</div>
                              <div className="text-sm text-muted-foreground">Date: {new Date(p.issued_at ?? Date.now()).toLocaleString()}</div>
                              <div>
                                <Label>Diagnosis</Label>
                                <p className="text-slate-700 mt-1">{p.diagnosis || "—"}</p>
                              </div>
                              <div>
                                <Label>Prescription Text</Label>
                                <p className="text-slate-700 whitespace-pre-wrap mt-1">{p.instructions || "—"}</p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorPrescriptions;
