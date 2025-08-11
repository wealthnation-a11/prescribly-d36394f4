import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Pill, Stethoscope, Phone, Mail, Calendar } from "lucide-react";

interface Profile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  avatar_url?: string | null;
}

interface Appointment {
  id: string;
  scheduled_time: string;
  notes: string | null;
  consultation_log: string | null;
}

interface Prescription {
  id: string;
  diagnosis: string | null;
  instructions: string | null;
  issued_at: string;
}

const formatDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");

export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDoctor, loading: roleLoading } = useUserRole();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user || !id) return;
      setLoading(true);

      // Patient profile (RLS allows if doctor has completed appointment with this patient)
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, phone, gender, date_of_birth, avatar_url")
        .eq("user_id", id)
        .maybeSingle();
      setProfile((prof as any) || null);

      // Appointments between this doctor and patient
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, scheduled_time, notes, consultation_log")
        .eq("doctor_id", user.id)
        .eq("patient_id", id)
        .order("scheduled_time", { ascending: false });
      setAppointments(((appts as any) || []) as Appointment[]);

      // Prescriptions for this patient by this doctor
      const { data: presc } = await supabase
        .from("prescriptions")
        .select("id, diagnosis, instructions, issued_at")
        .eq("doctor_id", user.id)
        .eq("patient_id", id)
        .order("issued_at", { ascending: false });
      setPrescriptions(((presc as any) || []) as Prescription[]);

      setLoading(false);
    };
    load();
  }, [user, id]);

  const lastAppointmentDate = useMemo(() => appointments[0]?.scheduled_time, [appointments]);

  if (roleLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">Loading...</div>
    );
  }

  if (!isDoctor) {
    navigate("/doctor-login", { replace: true });
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patient Records</h1>
          <p className="text-muted-foreground">View patient bio, notes, and prescriptions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="w-5 h-5 text-primary" /> Patient Bio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : !profile ? (
              <div className="text-muted-foreground">No profile available.</div>
            ) : (
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={profile.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {profile.first_name?.[0]}
                    {profile.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="font-semibold text-foreground">
                    {profile.first_name} {profile.last_name}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    <span>{profile.email}</span>
                  </div>
                  {profile.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <Badge variant="secondary">Last visit: {formatDateTime(lastAppointmentDate)}</Badge>
                  </div>
                </div>
              </div>
            )}
            <Button className="mt-4 w-full" onClick={() => navigate("/doctor/prescriptions")}>Write New Prescription</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-blue-600" /> Clinical Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : appointments.length === 0 ? (
              <div className="text-muted-foreground">No appointments found.</div>
            ) : (
              <div className="space-y-4">
                {appointments.slice(0, 5).map((a) => (
                  <div key={a.id} className="p-4 rounded-md border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Calendar className="w-3 h-3" /> {formatDateTime(a.scheduled_time)}
                    </div>
                    {a.notes && (
                      <div className="text-sm"><span className="font-medium">Notes: </span>{a.notes}</div>
                    )}
                    {a.consultation_log && (
                      <div className="text-sm mt-1 whitespace-pre-wrap"><span className="font-medium">Consultation: </span>{a.consultation_log}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Pill className="w-5 h-5 text-green-600" /> Prescriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : prescriptions.length === 0 ? (
            <div className="text-muted-foreground">No prescriptions found for this patient.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescriptions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDateTime(p.issued_at)}</TableCell>
                      <TableCell className="truncate max-w-[220px]">{p.diagnosis || "—"}</TableCell>
                      <TableCell className="truncate max-w-[360px]">{p.instructions || "—"}</TableCell>
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
}
