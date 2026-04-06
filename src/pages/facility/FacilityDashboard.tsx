import { FacilityLayout } from "@/components/FacilityLayout";
import { useFacilityStaff } from "@/hooks/useFacilityStaff";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, Clock, Users, XCircle, MapPin, Star, Bell, 
  BarChart3, Calendar, Brain, Shield, TrendingUp, Building2
} from "lucide-react";
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
        .select("*")
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
        .select("status, created_at, verified_at")
        .eq("facility_id", facilityId!);
      
      if (error) throw error;

      const todayCodes = codes?.filter(c => c.created_at?.startsWith(today)) || [];
      const confirmed = codes?.filter(c => c.status === "used") || [];
      const pending = codes?.filter(c => c.status === "pending") || [];
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

  const { data: appointments } = useQuery({
    queryKey: ["facility-appointments", facilityId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId!);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!facilityId,
  });

  const statCards = [
    { title: "Today's Codes", value: stats?.todayVisits, icon: Users, color: "text-primary" },
    { title: "Confirmed Visits", value: stats?.confirmed, icon: CheckCircle, color: "text-green-600" },
    { title: "Pending", value: stats?.pending, icon: Clock, color: "text-yellow-600" },
    { title: "Total Appointments", value: appointments, icon: Calendar, color: "text-blue-600" },
  ];

  const platformFeatures = [
    { icon: MapPin, title: "Hospital Map Visibility", description: "Your facility appears on Prescribly's hospital map for nearby patients to discover you.", active: facility?.is_verified },
    { icon: Calendar, title: "Direct Appointment Bookings", description: "Patients can book appointments with your facility directly through the platform.", active: true },
    { icon: Brain, title: "AI-Powered Recommendations", description: "Featured in AI-driven doctor & facility recommendations to relevant patients.", active: facility?.is_verified },
    { icon: Users, title: "Verified Patient Network", description: "Access a growing network of verified patients on the Prescribly platform.", active: true },
    { icon: Building2, title: "Free Digital Profile", description: "Your hospital has a professional digital profile page visible to all patients.", active: true },
    { icon: Bell, title: "Real-Time Notifications", description: "Get instant notifications for new appointment bookings and consultations.", active: true },
    { icon: Star, title: "Patient Reviews & Ratings", description: "Build trust with patient reviews and ratings on your facility profile.", active: true },
    { icon: Shield, title: "Seamless Booking Integration", description: "Fully integrated with Prescribly's booking system for smooth patient flow.", active: true },
    { icon: BarChart3, title: "Analytics Dashboard", description: "Track patient engagement, visit trends, and facility performance metrics.", active: true },
    { icon: TrendingUp, title: "Priority Launch Listing", description: "Get priority listing during the platform launch period for maximum visibility.", active: facility?.is_verified },
  ];

  return (
    <FacilityLayout>
      <div className="container mx-auto p-4 lg:p-6 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl lg:text-3xl font-bold">
              {facility?.name || "Facility Dashboard"}
            </h1>
            {facility?.is_verified && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" /> Verified
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm capitalize">
            {facility?.facility_type || "Healthcare Facility"} • Staff Portal
          </p>
        </div>

        {/* Stats Grid */}
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

        {/* Quick Actions */}
        <Card className="border-border/50 mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use the sidebar to verify patient registration codes, view visit history, or manage patient records.
            </p>
          </CardContent>
        </Card>

        {/* Platform Features */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Your Prescribly Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platformFeatures.map((feature) => (
              <Card key={feature.title} className="border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${feature.active ? 'bg-primary/10' : 'bg-muted'}`}>
                    <feature.icon className={`h-5 w-5 ${feature.active ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{feature.title}</h3>
                      {feature.active ? (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Pending Verification</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </FacilityLayout>
  );
};

export default FacilityDashboard;
