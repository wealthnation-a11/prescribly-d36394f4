import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  User,
  Stethoscope,
  Pill,
  FlaskConical,
  ArrowLeft,
  CalendarDays,
  HeartPulse,
} from "lucide-react";

import PatientRecordFiles from "@/components/admin/PatientRecordFiles";

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");

export default function PatientHealthRecords() {
  const [search, setSearch] = useState("");
  const [patient, setPatient] = useState<any>(null);

  const { data: patients, isLoading } = useQuery({
    queryKey: ["admin-hr-patients", search],
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, phone, gender, date_of_birth, country")
        .in("role", ["patient", "user"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`first_name.ilike.${s},last_name.ilike.${s},email.ilike.${s}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: record, isLoading: recordLoading } = useQuery({
    queryKey: ["admin-hr-record", patient?.user_id],
    enabled: !!patient?.user_id,
    queryFn: async () => {
      const id = patient.user_id;
      const [sessions, rx, labs, appts, diagnoses, vitals] = await Promise.all([
        supabase
          .from("consultation_sessions")
          .select("*")
          .eq("patient_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("prescriptions")
          .select("*")
          .eq("patient_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("lab_orders")
          .select("*")
          .eq("patient_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("appointments")
          .select("*")
          .eq("patient_id", id)
          .order("scheduled_time", { ascending: false }),
        supabase
          .from("user_diagnosis_history")
          .select("*")
          .eq("user_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("daily_health_logs")
          .select("*")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      return {
        sessions: sessions.data ?? [],
        rx: rx.data ?? [],
        labs: labs.data ?? [],
        appts: appts.data ?? [],
        diagnoses: diagnoses.data ?? [],
        vitals: vitals.data ?? [],
      };
    },
  });

  if (patient) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setPatient(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="font-semibold truncate">
              {patient.first_name} {patient.last_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {patient.email} · {patient.gender ?? "—"} ·{" "}
              {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : "DOB —"}
            </p>
          </div>
        </div>

        {recordLoading ? (
          <p className="text-sm text-muted-foreground">Loading health record…</p>
        ) : (
          <Tabs defaultValue="consultations">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="consultations" className="text-xs">Consults</TabsTrigger>
              <TabsTrigger value="prescriptions" className="text-xs">Rx</TabsTrigger>
              <TabsTrigger value="labs" className="text-xs">Labs</TabsTrigger>
              <TabsTrigger value="appointments" className="text-xs">Appts</TabsTrigger>
              <TabsTrigger value="vitals" className="text-xs">Vitals</TabsTrigger>
              <TabsTrigger value="files" className="text-xs">Files</TabsTrigger>
            </TabsList>

            <TabsContent value="consultations" className="pt-4 space-y-2">
              {record?.sessions.length === 0 && (
                <p className="text-sm text-muted-foreground">No consultations recorded.</p>
              )}
              {record?.sessions.map((s: any) => (
                <Card key={s.id}>
                  <CardContent className="p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium flex items-center gap-1.5">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        {s.mode} · {s.consult_type}
                      </span>
                      <Badge variant="secondary" className="capitalize">{s.status}</Badge>
                    </div>
                    <p className="text-muted-foreground">{s.symptoms || "No symptoms recorded"}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.scheduled_at ? `Scheduled ${fmt(s.scheduled_at)}` : fmt(s.created_at)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="prescriptions" className="pt-4 space-y-2">
              {record?.rx.length === 0 && (
                <p className="text-sm text-muted-foreground">No prescriptions recorded.</p>
              )}
              {record?.rx.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="p-3 text-sm space-y-1">
                    <p className="font-medium flex items-center gap-1.5">
                      <Pill className="h-4 w-4 text-emerald-600" />
                      {r.medication}
                    </p>
                    <p className="text-muted-foreground">
                      {r.dosage} · {r.frequency} · {r.duration}
                    </p>
                    {r.instructions && <p className="text-xs">{r.instructions}</p>}
                    <p className="text-xs text-muted-foreground">{fmt(r.created_at)}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="labs" className="pt-4 space-y-2">
              {record?.labs.length === 0 && (
                <p className="text-sm text-muted-foreground">No lab orders recorded.</p>
              )}
              {record?.labs.map((l: any) => (
                <Card key={l.id}>
                  <CardContent className="p-3 text-sm space-y-1">
                    <p className="font-medium flex items-center gap-1.5">
                      <FlaskConical className="h-4 w-4 text-sky-600" />
                      {l.test_name ?? "Lab test"}
                    </p>
                    <Badge variant="secondary" className="capitalize">{l.status}</Badge>
                    <p className="text-xs text-muted-foreground">{fmt(l.created_at)}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="appointments" className="pt-4 space-y-2">
              {record?.appts.length === 0 && (
                <p className="text-sm text-muted-foreground">No appointments recorded.</p>
              )}
              {record?.appts.map((a: any) => (
                <Card key={a.id}>
                  <CardContent className="p-3 text-sm space-y-1">
                    <p className="font-medium flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-teal-600" />
                      {fmt(a.scheduled_time)}
                    </p>
                    <Badge variant="secondary" className="capitalize">{a.status}</Badge>
                    {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="vitals" className="pt-4 space-y-2">
              {record?.vitals.length === 0 && (
                <p className="text-sm text-muted-foreground">No daily health logs recorded.</p>
              )}
              {record?.vitals.map((v: any) => (
                <Card key={v.id}>
                  <CardContent className="p-3 text-sm space-y-1">
                    <p className="font-medium flex items-center gap-1.5">
                      <HeartPulse className="h-4 w-4 text-rose-600" />
                      {v.log_date ?? fmt(v.created_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Object.entries(v)
                        .filter(
                          ([k, val]) =>
                            !["id", "user_id", "created_at", "updated_at", "log_date"].includes(k) &&
                            val !== null,
                        )
                        .map(([k, val]) => `${k.replace(/_/g, " ")}: ${val}`)
                        .join(" · ") || "No values"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="files" className="pt-4">
              <PatientRecordFiles patientId={patient.user_id} sessions={record?.sessions ?? []} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search patients by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading patients…</p>}
      {!isLoading && (patients ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No patients found.</p>
      )}

      <div className="space-y-2">
        {(patients ?? []).map((p: any) => (
          <button
            key={p.user_id}
            onClick={() => setPatient(p)}
            className="w-full text-left rounded-xl border p-3 hover:bg-muted/50 transition-colors flex items-center gap-3"
          >
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">
                {p.first_name} {p.last_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">{p.email}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
