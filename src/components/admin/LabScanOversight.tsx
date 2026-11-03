import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ScanRow = {
  id: string; user_id: string; patient_name: string | null; patient_email: string | null;
  file_name: string | null; status: string; amount: number; paid_at: string | null;
  payment_reference: string | null; created_at: string;
};

export const useAdminScans = () =>
  useQuery({
    queryKey: ["admin-lab-scans"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("admin_list_scans");
      if (error) throw error;
      return (data || []) as ScanRow[];
    },
  });

const LabScanOversight = () => {
  const { data = [], isLoading, error } = useAdminScans();
  const paid = data.filter((s) => s.status === "paid");
  const revenue = paid.filter((s) => s.payment_reference).reduce((t, s) => t + Number(s.amount || 0), 0);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (error) return <p className="text-sm text-destructive">Could not load lab scans.</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[["Total scans", data.length], ["Unlocked", paid.length], ["Revenue", `₦${revenue.toLocaleString()}`]].map(([l, v]) => (
          <Card key={l as string}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-bold">{v}</p>
          </CardContent></Card>
        ))}
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No lab scans uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {data.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{s.patient_name || s.patient_email || "Patient"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.file_name || "Scan"} · {new Date(s.created_at).toLocaleString()}
                </p>
                {s.payment_reference && <p className="text-[10px] text-muted-foreground truncate">Ref: {s.payment_reference}</p>}
              </div>
              <div className="text-right shrink-0">
                <Badge variant={s.status === "paid" ? "default" : s.status === "failed" ? "destructive" : "secondary"}>{s.status}</Badge>
                <p className="text-xs mt-1">₦{Number(s.amount || 0).toLocaleString()}{s.status === "paid" && !s.payment_reference ? " (free)" : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LabScanOversight;
