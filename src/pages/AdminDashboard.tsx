import { usePageSEO } from "@/hooks/usePageSEO";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import DoctorApplicationsManagement from "@/components/admin/DoctorApplicationsManagement";
import { HerbalPractitionersManagement } from "@/components/admin/HerbalPractitionersManagement";
import { HerbalRemediesModeration } from "@/components/admin/HerbalRemediesModeration";
import { HerbalArticlesModeration } from "@/components/admin/HerbalArticlesModeration";
import UserManagement from "@/components/admin/UserManagement";
import AppointmentManagement from "@/components/admin/AppointmentManagement";
import PaymentManagement from "@/components/admin/PaymentManagement";
import AIDiagnosisLogs from "@/components/admin/AIDiagnosisLogs";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import { RoleManagement } from "@/components/admin/RoleManagement";
import { SubscriptionManagement } from "@/components/admin/SubscriptionManagement";
import BlogManagement from "@/components/admin/BlogManagement";
import CommentModeration from "@/components/admin/CommentModeration";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, Clock, TrendingUp } from "lucide-react";
import { WelcomeMessage } from "@/components/WelcomeMessage";
import { DashboardTour, getAdminDashboardSteps } from "@/components/DashboardTour";
import { Skeleton } from "@/components/ui/skeleton";

const AdminDashboard = () => {
  const { userProfile } = useAuth();
  const [runTour, setRunTour] = useState(false);
  const [activeSection, setActiveSection] = useState("analytics");

  useEffect(() => {
    if (userProfile && !userProfile.dashboard_tour_completed) {
      setTimeout(() => {
        const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) {
          // Tour will be triggered by welcome message button
        }
      }, 1000);
    }
  }, [userProfile]);

  usePageSEO({
    title: "Admin Dashboard - Prescribly",
    description: "Administrative dashboard for managing the entire platform",
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-analytics", {
        body: { action: "dashboard-stats" },
      });
      if (error) throw error;
      return data.stats;
    },
  });

  const { data: pendingCounts } = useQuery({
    queryKey: ["admin-pending-counts"],
    queryFn: async () => {
      const [doctorsRes, herbalPracRes, remediesRes, articlesRes] = await Promise.all([
        supabase.from("doctors").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("herbal_practitioners").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("herbal_remedies").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("herbal_articles").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
      ]);
      return {
        doctors: doctorsRes.count || 0,
        herbalPractitioners: herbalPracRes.count || 0,
        herbalRemedies: remediesRes.count || 0,
        herbalArticles: articlesRes.count || 0,
      };
    },
  });

  const renderContent = () => {
    switch (activeSection) {
      case "analytics":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
              <CardDescription>Overview of platform performance and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminAnalytics />
            </CardContent>
          </Card>
        );
      case "users":
        return (
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage all user accounts and subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagement />
            </CardContent>
          </Card>
        );
      case "roles":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>Assign and manage user roles across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <RoleManagement />
            </CardContent>
          </Card>
        );
      case "subscriptions":
        return <SubscriptionManagement />;
      case "doctors":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Doctor Applications Management</CardTitle>
              <CardDescription>Review and manage doctor registration applications</CardDescription>
            </CardHeader>
            <CardContent>
              <DoctorApplicationsManagement />
            </CardContent>
          </Card>
        );
      case "herbal":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Herbal Practitioners Management</CardTitle>
              <CardDescription>Review and manage herbal practitioner applications</CardDescription>
            </CardHeader>
            <CardContent>
              <HerbalPractitionersManagement />
            </CardContent>
          </Card>
        );
      case "herbal-remedies":
        return <HerbalRemediesModeration />;
      case "herbal-articles":
        return <HerbalArticlesModeration />;
      case "appointments":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Appointment Management</CardTitle>
              <CardDescription>Monitor all appointments across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <AppointmentManagement />
            </CardContent>
          </Card>
        );
      case "payments":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Payment Management</CardTitle>
              <CardDescription>Track all transactions and financial data</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentManagement />
            </CardContent>
          </Card>
        );
      case "ai-logs":
        return (
          <Card>
            <CardHeader>
              <CardTitle>AI Diagnosis Logs</CardTitle>
              <CardDescription>Monitor AI diagnosis performance and accuracy</CardDescription>
            </CardHeader>
            <CardContent>
              <AIDiagnosisLogs />
            </CardContent>
          </Card>
        );
      case "blog":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Blog Management</CardTitle>
              <CardDescription>Manage blog posts and moderate comments</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="posts" className="w-full">
                <TabsList>
                  <TabsTrigger value="posts">Blog Posts</TabsTrigger>
                  <TabsTrigger value="comments">Comments</TabsTrigger>
                </TabsList>
                <TabsContent value="posts" className="space-y-4">
                  <BlogManagement />
                </TabsContent>
                <TabsContent value="comments" className="space-y-4">
                  <CommentModeration />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, loading }: {
    title: string;
    value: number;
    subtitle: string;
    icon: React.ElementType;
    loading?: boolean;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );

  return (
    <>
      <DashboardTour
        run={runTour}
        onComplete={() => setRunTour(false)}
        steps={getAdminDashboardSteps()}
        userRole="admin"
      />

      <div className="flex min-h-screen bg-background">
        <AdminSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          pendingCounts={pendingCounts}
        />

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 lg:p-6 pt-16 lg:pt-6">
            {/* Welcome Message */}
            <div className="mb-6">
              <WelcomeMessage
                onStartTour={() => setRunTour(true)}
                showTourButton={!userProfile?.dashboard_tour_completed}
              />
            </div>

            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1 text-sm lg:text-base">
                Comprehensive platform management and oversight
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6" data-tour="stats">
              <StatCard
                title="Total Doctors"
                value={stats?.totalDoctors || 0}
                subtitle="All registered doctors"
                icon={Users}
                loading={statsLoading}
              />
              <StatCard
                title="Approved"
                value={stats?.approvedDoctors || 0}
                subtitle="Active doctors"
                icon={UserCheck}
                loading={statsLoading}
              />
              <StatCard
                title="Pending"
                value={stats?.pendingDoctors || 0}
                subtitle="Awaiting approval"
                icon={Clock}
                loading={statsLoading}
              />
              <StatCard
                title="This Month"
                value={stats?.newApplications || 0}
                subtitle="New applications"
                icon={TrendingUp}
                loading={statsLoading}
              />
            </div>

            {/* Content Area */}
            <div data-tour="tabs">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default AdminDashboard;
