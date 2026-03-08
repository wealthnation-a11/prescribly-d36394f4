import { FacilityLayout } from "@/components/FacilityLayout";
import { useFacilityStaff } from "@/hooks/useFacilityStaff";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { usePageSEO } from "@/hooks/usePageSEO";

const FacilityVisitHistory = () => {
  const { facilityId } = useFacilityStaff();

  usePageSEO({
    title: "Visit History - Facility Portal",
    description: "View all patient visit registrations",
  });

  const { data: codes, isLoading } = useQuery({
    queryKey: ["facility-visit-history", facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registration_codes")
        .select("*")
        .eq("facility_id", facilityId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      // Fetch patient names for each code
      const patientIds = [...new Set(data?.map(c => c.patient_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", patientIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data?.map(c => ({
        ...c,
        patient_name: profileMap.has(c.patient_id)
          ? `${profileMap.get(c.patient_id)!.first_name} ${profileMap.get(c.patient_id)!.last_name}`
          : "Unknown",
      })) || [];
    },
    enabled: !!facilityId,
  });

  const getStatusBadge = (status: string, expiresAt: string) => {
    if (status === "used") return <Badge variant="secondary">Confirmed</Badge>;
    if (new Date(expiresAt) < new Date()) return <Badge variant="destructive">Expired</Badge>;
    return <Badge>Active</Badge>;
  };

  return (
    <FacilityLayout>
      <div className="container mx-auto p-4 lg:p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Visit History</h1>
          <p className="text-muted-foreground text-sm mt-1">
            All patient registration codes for your facility
          </p>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Registration Codes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !codes?.length ? (
              <p className="text-center text-muted-foreground py-8">No registration codes found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Confirmed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono font-bold tracking-wider">
                          {item.code}
                        </TableCell>
                        <TableCell>{item.patient_name}</TableCell>
                        <TableCell>{getStatusBadge(item.status, item.expires_at)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(item.created_at), "PP")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.confirmed_at ? format(new Date(item.confirmed_at), "PPp") : "—"}
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
    </FacilityLayout>
  );
};

export default FacilityVisitHistory;
