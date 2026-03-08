import { FacilityLayout } from "@/components/FacilityLayout";
import { useFacilityStaff } from "@/hooks/useFacilityStaff";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock, Users, XCircle } from "lucide-react";
import { usePageSEO } from "@/hooks/usePageSEO";
import { format } from "date-fns";

const FacilityDashboard = () => {
  const { facilityId } = useFacilityStaff();

  usePageSEO({
    title: "Facility Dashboard - Prescribly",
    description: "Hospital staff dashboard for managing patient visits",
  });

  const { data: facility } = useQuery({
    queryKey: ["facility-info", facilityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("name, type")
        .eq("id", facilityId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!facilityId,
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["facility-stats", facilityId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      
      const { data: codes, error } = await supabase
        .from("registration_codes")
        .select("status, created_at, confirmed_at")
        .eq("facility_id", facilityId!);
      
      if (error) throw error;

      const todayCodes = codes?.filter(c => c.created_at?.startsWith(today)) || [];
      const confirmed = codes?.filter(c => c.status === "used") || [];
      const pending = codes?.filter(c => c.status === "active") || [];
      const expired = codes?.filter(c => c.status === "expired") || [];

      return {
        todayVisits: todayCodes.length,
        confirmed: confirmed.length,
        pending: pending.length,
        expired: expired.length,
        total: codes?.length || 0,
      };
    },
    enabled: !!facilityId,
  });

  const statCards = [
    { title: "Today's Codes", value: stats?.todayVisits, icon: Users, color: "text-blue-500" },
    { title: "Confirmed Visits", value: stats?.confirmed, icon: CheckCircle, color: "text-emerald-500" },
    { title: "Pending", value: stats?.pending, icon: Clock, color: "text-amber-500" },
    { title: "Expired", value: stats?.expired, icon: XCircle, color: "text-destructive" },
  ];

  return (
    <FacilityLayout>
      <div className="container mx-auto p-4 lg:p-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold">
            {facility?.name || "Facility Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm capitalize">
            {facility?.type || "Healthcare Facility"} • Staff Portal
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.title} className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-xl lg:text-2xl font-bold">{stat.value ?? 0}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use the sidebar to verify patient registration codes or view visit history.
            </p>
          </CardContent>
        </Card>
      </div>
    </FacilityLayout>
  );
};

export default FacilityDashboard;
