import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Appointment {
  id: string;
  patient_name: string;
  doctor_name: string;
  scheduled_time: string;
  status: string;
  consultation_fee: number;
  notes: string;
}

const AppointmentManagement = () => {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["admin-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-appointments", {
        body: { action: "list" },
      });
      if (error) throw error;
      return data.appointments as Appointment[];
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      completed: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const filterAppointments = (status?: string) => {
    if (!appointments) return [];
    if (!status) return appointments;
    return appointments.filter((apt) => apt.status === status);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading appointments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Appointment Management</h2>
          <p className="text-muted-foreground">
            Monitor all appointments across the platform
          </p>
        </div>
      </div>

      <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="pending">Pending</TabsTrigger>
        <TabsTrigger value="approved">Approved</TabsTrigger>
        <TabsTrigger value="completed">Completed</TabsTrigger>
      </TabsList>

      {["all", "pending", "approved", "completed"].map((status) => (
        <TabsContent key={status} value={status}>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Scheduled Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterAppointments(status === "all" ? undefined : status).map((apt) => (
                  <TableRow key={apt.id}>
                    <TableCell>{apt.patient_name}</TableCell>
                    <TableCell>{apt.doctor_name}</TableCell>
                    <TableCell>
                      {new Date(apt.scheduled_time).toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(apt.status)}</TableCell>
                    <TableCell>₦{apt.consultation_fee?.toLocaleString()}</TableCell>
                    <TableCell className="max-w-xs truncate">{apt.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      ))}
    </Tabs>
    </div>
  );
};

export default AppointmentManagement;
