import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Truck, Phone, Mail, MapPin, CheckCircle, Ban, RotateCcw } from "lucide-react";

type Company = {
  id: string; name: string; contact_person: string | null; email: string | null; phone: string | null;
  city: string | null; state: string | null; address: string | null; coverage_areas: string | null;
  registration_number: string | null; status: string; is_active: boolean; admin_notes: string | null; created_at: string;
};

export default function LogisticsManagement() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["admin-logistics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("logistics_companies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Company[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ c, status }: { c: Company; status: string }) => {
      const { error } = await supabase.from("logistics_companies").update({
        status, is_active: status === "approved", admin_notes: notes[c.id] ?? c.admin_notes,
      }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      toast.success(`Company ${v.status}`);
      qc.invalidateQueries({ queryKey: ["admin-logistics"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-counts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const list = companies.filter((c) => tab === "all" || c.status === tab);
  const count = (s: string) => companies.filter((c) => c.status === s).length;

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="pending">Pending ({count("pending")})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({count("approved")})</TabsTrigger>
          <TabsTrigger value="suspended">Suspended ({count("suspended")})</TabsTrigger>
          <TabsTrigger value="all">All ({companies.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : list.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No logistics companies here.</p>
      ) : list.map((c) => (
        <Card key={c.id}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.contact_person || "—"} · Registered {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={c.status === "approved" ? "default" : c.status === "suspended" ? "destructive" : "secondary"} className="capitalize">
                {c.status}
              </Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
              {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
              {c.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{c.email}</span>}
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[c.address, c.city, c.state].filter(Boolean).join(", ") || "—"}</span>
              {c.coverage_areas && <span>Covers: {c.coverage_areas}</span>}
              {c.registration_number && <span>Reg. no: {c.registration_number}</span>}
            </div>
            <Textarea
              placeholder="Note to the company (optional)"
              className="text-sm min-h-[60px]"
              value={notes[c.id] ?? c.admin_notes ?? ""}
              onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })}
            />
            <div className="flex flex-wrap gap-2">
              {c.status !== "approved" && (
                <Button size="sm" onClick={() => update.mutate({ c, status: "approved" })} disabled={update.isPending}>
                  {c.status === "suspended" ? <RotateCcw className="h-4 w-4 mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  {c.status === "suspended" ? "Reactivate" : "Approve"}
                </Button>
              )}
              {c.status === "approved" && (
                <Button size="sm" variant="destructive" onClick={() => update.mutate({ c, status: "suspended" })} disabled={update.isPending}>
                  <Ban className="h-4 w-4 mr-1" />Suspend
                </Button>
              )}
              {c.status === "pending" && (
                <Button size="sm" variant="outline" onClick={() => update.mutate({ c, status: "rejected" })} disabled={update.isPending}>
                  Reject
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
