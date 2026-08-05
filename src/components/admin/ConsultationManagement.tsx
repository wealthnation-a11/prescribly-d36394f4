import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CalendarClock, Search, Stethoscope, Video, Phone, MessageSquare, AlertTriangle } from "lucide-react";

const MODE_ICON: Record<string, any> = { video: Video, voice: Phone, chat: MessageSquare };

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");
const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function ConsultationManagement() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [newTime, setNewTime] = useState("");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["admin-consultations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultation_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      const ids = Array.from(
        new Set([...(data ?? []).map((s: any) => s.patient_id), ...(data ?? []).map((s: any) => s.doctor_id)]),
      ).filter(Boolean) as string[];
      let profiles: any[] = [];
      if (ids.length) {
        const { data: p } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, email")
          .in("user_id", ids);
        profiles = p ?? [];
      }
      const name = (id: string | null) => {
        const p = profiles.find((x) => x.user_id === id);
        return p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email : null;
      };
      return (data ?? []).map((s: any) => ({
        ...s,
        patient_name: name(s.patient_id) ?? "Unknown patient",
        doctor_name: name(s.doctor_id),
      }));
    },
  });

  const reschedule = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase
        .from("consultation_sessions")
        .update({ scheduled_at: value ? new Date(value).toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Schedule updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-consultations"] });
    },
    onError: () => toast.error("Could not update schedule"),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("consultation_sessions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin-consultations"] });
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return sessions;
    return sessions.filter(
      (x: any) =>
        x.patient_name?.toLowerCase().includes(s) ||
        x.doctor_name?.toLowerCase().includes(s) ||
        x.symptoms?.toLowerCase().includes(s),
    );
  }, [sessions, search]);

  const buckets = {
    scheduled: filtered.filter((s: any) => !!s.scheduled_at && s.status !== "completed"),
    live: filtered.filter((s: any) => ["waiting", "active", "paid"].includes(s.status) && !s.scheduled_at),
    all: filtered,
  };

  const Row = ({ s }: { s: any }) => {
    const Icon = MODE_ICON[s.mode] ?? Stethoscope;
    return (
      <Card>
        <CardContent className="p-3 space-y-2 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium truncate">{s.patient_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {s.doctor_name ? `Dr. ${s.doctor_name}` : "Unassigned"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="secondary" className="capitalize">{s.status}</Badge>
              {s.is_emergency && (
                <Badge variant="destructive" className="gap-1 text-[10px]">
                  <AlertTriangle className="h-3 w-3" /> Urgent
                </Badge>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5 capitalize">
            <Icon className="h-3.5 w-3.5" /> {s.mode ?? "chat"} · {String(s.consult_type ?? "").replace("_", " ")}
          </p>
          {s.symptoms && <p className="text-muted-foreground line-clamp-2">{s.symptoms}</p>}

          <p className="text-xs flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-primary" />
            {s.scheduled_at ? (
              <span className="font-medium">Scheduled {fmt(s.scheduled_at)}</span>
            ) : (
              <span className="text-muted-foreground">Instant · created {fmt(s.created_at)}</span>
            )}
          </p>

          {editing === s.id ? (
            <div className="space-y-2 pt-1">
              <Label className="text-xs">New date & time</Label>
              <Input
                type="datetime-local"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={reschedule.isPending}
                  onClick={() => reschedule.mutate({ id: s.id, value: newTime })}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(s.id);
                  setNewTime(toLocalInput(s.scheduled_at));
                }}
              >
                {s.scheduled_at ? "Reschedule" : "Set schedule"}
              </Button>
              {s.status !== "completed" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStatus.mutate({ id: s.id, status: "cancelled" })}
                >
                  Cancel session
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by patient, doctor or symptoms"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs defaultValue="scheduled">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="scheduled" className="text-xs">Booked later ({buckets.scheduled.length})</TabsTrigger>
          <TabsTrigger value="live" className="text-xs">Instant ({buckets.live.length})</TabsTrigger>
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
        </TabsList>
        {(["scheduled", "live", "all"] as const).map((k) => (
          <TabsContent key={k} value={k} className="pt-4 space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && buckets[k].length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nothing here yet.</p>
            )}
            {buckets[k].map((s: any) => (
              <Row key={s.id} s={s} />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
