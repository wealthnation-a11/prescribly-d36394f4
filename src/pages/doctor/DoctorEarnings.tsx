import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar, DollarSign, TrendingUp } from "lucide-react";

interface CallLogRow {
  id: string;
  call_date: string;
  patient_id: string;
  patient_payment: number | null;
  doctor_earnings: number | null;
  admin_fee: number | null;
  status: string | null;
}

export const DoctorEarnings = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<CallLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const totals = useMemo(() => {
    const completed = rows.filter((r) => r.status === "completed");
    const calls = completed.length;
    const paidByPatients = completed.reduce((sum, r) => sum + (Number(r.patient_payment ?? 0)), 0);
    const doctor = completed.reduce((sum, r) => sum + (Number(r.doctor_earnings ?? 0)), 0);
    const admin = completed.reduce((sum, r) => sum + (Number(r.admin_fee ?? 0)), 0);
    const lastDate = completed[0]?.call_date ? new Date(completed[0].call_date) : undefined;
    return { calls, paidByPatients, doctor, admin, lastDate };
  }, [rows]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("call_logs")
        .select("id, call_date, patient_id, patient_payment, doctor_earnings, admin_fee, status")
        .eq("doctor_id", user.id)
        .eq("status", "completed")
        .order("call_date", { ascending: false });
      if (error) {
        console.error(error);
      } else {
        setRows((data as any[]) as CallLogRow[]);
      }
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("call_logs_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_logs" },
        (payload) => {
          const doc = (payload.new as any) || (payload.old as any);
          if (doc?.doctor_id === user.id) {
            fetchData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Please log in</h3>
            <p className="text-slate-600">You must be logged in to view earnings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
        <p className="text-slate-600">Track your calls and payouts in real-time</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Completed Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.calls}</p>
            <p className="text-sm text-slate-600">this period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Paid by Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₦{totals.paidByPatients.toLocaleString()}</p>
            <p className="text-sm text-slate-600">sum of completed calls</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              Doctor Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₦{totals.doctor.toLocaleString()}</p>
            <p className="text-sm text-slate-600">₦8,000 per 1,000 calls equivalent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-orange-600" />
              Admin Share
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₦{totals.admin.toLocaleString()}</p>
            <p className="text-sm text-slate-600">platform fees</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">
          Last completed call: {totals.lastDate ? totals.lastDate.toLocaleDateString() : "—"}
        </Badge>
        <Badge variant="outline">Estimated unpaid: ₦{totals.doctor.toLocaleString()}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-slate-600" />
            Earnings History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-600">Loading...</p>
          ) : rows.length === 0 ? (
            <div className="text-center text-slate-600 py-8">No completed calls yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead className="text-right">Paid by Patient</TableHead>
                    <TableHead className="text-right">Doctor</TableHead>
                    <TableHead className="text-right">Admin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.call_date).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{r.patient_id?.slice(0, 8)}…</TableCell>
                      <TableCell className="text-right">₦{Number(r.patient_payment ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">₦{Number(r.doctor_earnings ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">₦{Number(r.admin_fee ?? 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-slate-600">
            Earnings are calculated based on completed audio calls. You earn $8 per call. Payments are processed weekly or
            monthly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorEarnings;
