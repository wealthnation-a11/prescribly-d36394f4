import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DoctorLayout } from "@/components/DoctorLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Video,
  Phone,
  MessageSquare,
  CalendarClock,
  AlertTriangle,
  Stethoscope,
  User,
} from "lucide-react";

const MODE_ICON: Record<string, any> = {
  video: Video,
  voice: Phone,
  chat: MessageSquare,
};

const fmt = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function DoctorConsultations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("requests");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["doctor-consultations", user?.id],
    enabled: !!user?.id,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultation_sessions")
        .select("*")
        .or(`doctor_id.eq.${user!.id},doctor_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const ids = Array.from(new Set((data ?? []).map((s: any) => s.patient_id))).filter(Boolean);
      let profiles: any[] = [];
      if (ids.length) {
        const { data: p } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, gender, date_of_birth")
          .in("user_id", ids);
        profiles = p ?? [];
      }
      return (data ?? []).map((s: any) => ({
        ...s,
        patient: profiles.find((p) => p.user_id === s.patient_id) ?? null,
      }));
    },
  });

  const claim = useMutation({
    mutationFn: async (session: any) => {
      const { error } = await supabase
        .from("consultation_sessions")
        .update({ doctor_id: user!.id })
        .eq("id", session.id)
        .is("doctor_id", null);
      if (error) throw error;
      return session.id as string;
    },
    onSuccess: (id) => {
      toast.success("Consultation accepted");
      qc.invalidateQueries({ queryKey: ["doctor-consultations"] });
      navigate(`/consultation/${id}/live`);
    },
    onError: () => toast.error("Could not accept — it may have been taken already"),
  });

  const buckets = useMemo(() => {
    const paid = (s: any) => ["waiting", "paid", "active"].includes(s.status);
    return {
      requests: sessions.filter((s: any) => !s.doctor_id && !s.scheduled_at && paid(s)),
      scheduled: sessions.filter((s: any) => !!s.scheduled_at && s.status !== "completed"),
      active: sessions.filter((s: any) => s.doctor_id === user?.id && s.status === "active"),
      completed: sessions.filter((s: any) => s.status === "completed" && s.doctor_id === user?.id),
    };
  }, [sessions, user?.id]);

  const Row = ({ s }: { s: any }) => {
    const Icon = MODE_ICON[s.mode] ?? Stethoscope;
    const mine = s.doctor_id === user?.id;
    return (
      <Card className={s.is_emergency ? "border-destructive/50" : ""}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold flex items-center gap-2 truncate">
                <User className="h-4 w-4 text-primary shrink-0" />
                {s.patient
                  ? `${s.patient.first_name ?? ""} ${s.patient.last_name ?? ""}`.trim() || "Patient"
                  : "Patient"}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 capitalize">
                <Icon className="h-3.5 w-3.5" />
                {s.mode ?? "chat"} · {String(s.consult_type ?? "").replace("_", " ")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="secondary" className="capitalize">
                {s.status}
              </Badge>
              {s.is_emergency && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Urgent
                </Badge>
              )}
            </div>
          </div>

          {s.symptoms && (
            <p className="text-sm text-muted-foreground line-clamp-2">{s.symptoms}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {s.duration_answer && <span>Duration: {s.duration_answer}</span>}
            {s.severity != null && <span>Severity: {s.severity}/10</span>}
            {Array.isArray(s.other_symptoms) && s.other_symptoms.length > 0 && (
              <span>Also: {s.other_symptoms.join(", ")}</span>
            )}
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            {s.scheduled_at ? `Scheduled for ${fmt(s.scheduled_at)}` : `Requested ${fmt(s.created_at)}`}
          </p>

          <div className="flex gap-2 pt-1">
            {!s.doctor_id ? (
              <Button
                size="sm"
                className="flex-1"
                disabled={claim.isPending}
                onClick={() => claim.mutate(s)}
              >
                Accept consultation
              </Button>
            ) : mine ? (
              <Button
                size="sm"
                className="flex-1"
                variant={s.status === "completed" ? "outline" : "default"}
                onClick={() => navigate(`/consultation/${s.id}/live`)}
              >
                {s.status === "completed" ? "View record" : "Open consultation room"}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  };

  const List = ({ items, empty }: { items: any[]; empty: string }) => (
    <div className="space-y-3 pt-4">
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10">{empty}</p>
      )}
      {items.map((s) => (
        <Row key={s.id} s={s} />
      ))}
    </div>
  );

  return (
    <DoctorLayout title="Consultations">
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">Consultations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live requests, scheduled bookings and your consultation history.
        </p>

        <Tabs value={tab} onValueChange={setTab} className="mt-5">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="requests" className="text-xs">
              Requests ({buckets.requests.length})
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="text-xs">
              Scheduled ({buckets.scheduled.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs">
              Active ({buckets.active.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">
              Past
            </TabsTrigger>
          </TabsList>
          <TabsContent value="requests">
            <List items={buckets.requests} empty="No waiting patients right now." />
          </TabsContent>
          <TabsContent value="scheduled">
            <List items={buckets.scheduled} empty="No scheduled consultations." />
          </TabsContent>
          <TabsContent value="active">
            <List items={buckets.active} empty="No consultation in progress." />
          </TabsContent>
          <TabsContent value="completed">
            <List items={buckets.completed} empty="No completed consultations yet." />
          </TabsContent>
        </Tabs>
      </div>
    </DoctorLayout>
  );
}
