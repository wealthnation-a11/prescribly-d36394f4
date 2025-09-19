import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, Calendar, DollarSign, Activity, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  // Fetch dashboard stats
  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: totalDoctors },
        { count: pendingDoctors },
        { count: totalAppointments },
        { count: todayAppointments }
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("doctors").select("*", { count: "exact", head: true }),
        supabase.from("doctors").select("*", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("appointments").select("*", { count: "exact", head: true }),
        supabase.from("appointments").select("*", { count: "exact", head: true })
          .gte("scheduled_time", new Date().toISOString().split("T")[0])
          .lt("scheduled_time", new Date(Date.now() + 86400000).toISOString().split("T")[0])
      ]);

      return {
        totalUsers: totalUsers || 0,
        totalDoctors: totalDoctors || 0,
        pendingDoctors: pendingDoctors || 0,
        totalAppointments: totalAppointments || 0,
        todayAppointments: todayAppointments || 0,
      };
    },
  });

  const stats = [
    {
      title: "Total Users",
      value: dashboardStats?.totalUsers || 0,
      icon: Users,
      description: "Registered users",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: "/admin/users",
    },
    {
      title: "Total Doctors",
      value: dashboardStats?.totalDoctors || 0,
      icon: UserCheck,
      description: "Verified doctors",
      color: "text-green-600",
      bgColor: "bg-green-50",
      link: "/admin/doctors",
    },
    {
      title: "Pending Approvals",
      value: dashboardStats?.pendingDoctors || 0,
      icon: Clock,
      description: "Awaiting verification",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      link: "/admin/doctors?status=pending",
    },
    {
      title: "Today's Appointments",
      value: dashboardStats?.todayAppointments || 0,
      icon: Calendar,
      description: "Scheduled today",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      link: "/admin/appointments",
    },
  ];

  const quickActions = [
    {
      title: "Review Doctor Applications",
      description: "Approve or reject pending doctor verifications",
      icon: UserCheck,
      link: "/admin/doctors?status=pending",
      color: "border-orange-200 hover:border-orange-300",
    },
    {
      title: "Manage Users",
      description: "View and manage all registered users",
      icon: Users,
      link: "/admin/users",
      color: "border-blue-200 hover:border-blue-300",
    },
    {
      title: "View Analytics",
      description: "Check system performance and usage statistics",
      icon: Activity,
      link: "/admin/analytics",
      color: "border-green-200 hover:border-green-300",
    },
    {
      title: "Financial Reports",
      description: "Review revenue and transaction reports",
      icon: DollarSign,
      link: "/admin/finance",
      color: "border-emerald-200 hover:border-emerald-300",
    },
  ];

  return (
    <AdminLayout title="Admin Dashboard" subtitle="Monitor and manage the Prescribly platform">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 border">
          <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to Admin Portal</h2>
          <p className="text-muted-foreground">
            Monitor platform activity, manage users and doctors, and oversee system operations.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {isLoading ? "..." : stat.value.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                <Link to={stat.link} className="mt-2 inline-block">
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    View Details →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {quickActions.map((action) => (
              <Link key={action.title} to={action.link}>
                <Card className={`hover:shadow-md transition-all cursor-pointer ${action.color}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <action.icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{action.title}</CardTitle>
                        <CardDescription>{action.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent System Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">New User</Badge>
                  <span className="text-sm">New patient registration</span>
                </div>
                <span className="text-xs text-muted-foreground">2 min ago</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Doctor</Badge>
                  <span className="text-sm">Doctor application submitted</span>
                </div>
                <span className="text-xs text-muted-foreground">15 min ago</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge>Appointment</Badge>
                  <span className="text-sm">New appointment booked</span>
                </div>
                <span className="text-xs text-muted-foreground">1 hour ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}