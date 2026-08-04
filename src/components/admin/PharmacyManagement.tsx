import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Pill, MapPin, Phone, Mail, ShieldCheck, Ban, Trash2, Flag } from "lucide-react";

type Action = "approve" | "reject" | "suspend" | "reactivate" | "delete";

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    suspended: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  };
  return <Badge className={map[status] ?? ""}>{status}</Badge>;
};

export default function PharmacyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState<any>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [notes, setNotes] = useState("");

  const { data: pharmacies, isLoading } = useQuery({
    queryKey: ["admin-pharmacies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["admin-pharmacy-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacy_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const mutate = useMutation({
    mutationFn: async ({ id, action, notes }: { id: string; action: Action; notes?: string }) => {
      if (action === "delete") {
        const { error } = await supabase.from("pharmacies").delete().eq("id", id);
        if (error) throw error;
        return;
      }
      const patch: Record<string, any> = { admin_notes: notes || null };
      if (action === "approve") {
        patch.status = "approved";
        patch.is_active = true;
      } else if (action === "reject") {
        patch.status = "rejected";
        patch.is_active = false;
      } else if (action === "suspend") {
        patch.status = "suspended";
        patch.is_active = false;
      } else if (action === "reactivate") {
        patch.status = "approved";
        patch.is_active = true;
      }
      const { error } = await supabase.from("pharmacies").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Done", description: "Pharmacy updated." });
      queryClient.invalidateQueries({ queryKey: ["admin-pharmacies"] });
      setSelected(null);
      setAction(null);
      setNotes("");
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resolveReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pharmacy_reports")
        .update({ status: "resolved" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-pharmacy-reports"] }),
  });

  const reportCount = (pharmacyId: string) =>
    (reports ?? []).filter((r: any) => r.pharmacy_id === pharmacyId && r.status === "open").length;

  const list = (pharmacies ?? []).filter((p: any) =>
    tab === "all" ? true : tab === "reported" ? reportCount(p.id) > 0 : p.status === tab,
  );

  const openAction = (pharmacy: any, a: Action) => {
    setSelected(pharmacy);
    setAction(a);
    setNotes(pharmacy.admin_notes ?? "");
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            Pending
            {(pharmacies ?? []).filter((p: any) => p.status === "pending").length > 0 && (
              <span className="ml-1.5 text-[10px] rounded-full bg-amber-500 text-white px-1.5">
                {(pharmacies ?? []).filter((p: any) => p.status === "pending").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs sm:text-sm">Approved</TabsTrigger>
          <TabsTrigger value="suspended" className="text-xs sm:text-sm">Suspended</TabsTrigger>
          <TabsTrigger value="reported" className="text-xs sm:text-sm">Reported</TabsTrigger>
          <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="pt-4 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading pharmacies…</p>}
          {!isLoading && list.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No pharmacies in this view.
            </p>
          )}

          {list.map((p: any) => {
            const openReports = reportCount(p.id);
            return (
              <Card key={p.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Pill className="h-4 w-4 text-primary shrink-0" />
                        <p className="font-semibold truncate">{p.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {p.address} · {p.city} {p.state ?? ""}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {p.email ?? "—"}
                        <Phone className="h-3 w-3 ml-2" /> {p.phone ?? "—"}
                      </p>
                      {p.license_number && (
                        <p className="text-xs text-muted-foreground mt-1">
                          License: {p.license_number}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {statusBadge(p.status)}
                      {openReports > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <Flag className="h-3 w-3" /> {openReports}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {p.admin_notes && (
                    <p className="text-xs bg-muted rounded-lg p-2">{p.admin_notes}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {p.status !== "approved" && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => openAction(p, p.status === "suspended" ? "reactivate" : "approve")}
                      >
                        <ShieldCheck className="h-4 w-4 mr-1.5" />
                        {p.status === "suspended" ? "Reactivate" : "Approve"}
                      </Button>
                    )}
                    {p.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => openAction(p, "reject")}>
                        Reject
                      </Button>
                    )}
                    {p.status === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => openAction(p, "suspend")}>
                        <Ban className="h-4 w-4 mr-1.5" /> Suspend
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => openAction(p, "delete")}>
                      <Trash2 className="h-4 w-4 mr-1.5" /> Remove
                    </Button>
                  </div>

                  {openReports > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-xs font-semibold">Patient reports</p>
                      {(reports ?? [])
                        .filter((r: any) => r.pharmacy_id === p.id && r.status === "open")
                        .map((r: any) => (
                          <div key={r.id} className="text-xs bg-destructive/5 rounded-lg p-2">
                            <p className="font-medium">{r.reason}</p>
                            {r.details && <p className="text-muted-foreground">{r.details}</p>}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 mt-1"
                              onClick={() => resolveReport.mutate(r.id)}
                            >
                              Mark resolved
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <Dialog open={!!action} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{action} pharmacy</DialogTitle>
            <DialogDescription>
              {action === "delete"
                ? `This permanently removes "${selected?.name}", its price list and order history.`
                : action === "approve" || action === "reactivate"
                  ? `"${selected?.name}" will become visible to patients and can receive orders.`
                  : `"${selected?.name}" will be hidden from patients.`}
            </DialogDescription>
          </DialogHeader>
          {action !== "delete" && (
            <Textarea
              placeholder="Notes for the pharmacy (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              variant={action === "delete" ? "destructive" : "default"}
              disabled={mutate.isPending}
              onClick={() => selected && mutate.mutate({ id: selected.id, action: action!, notes })}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
