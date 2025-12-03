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
import { Users, UserCheck, Clock, TrendingUp, Activity } from "lucide-react";
import { WelcomeMessage } from "@/components/WelcomeMessage";
import { DashboardTour, getAdminDashboardSteps } from "@/components/DashboardTour";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Platform Analytics
              </CardTitle>
              <CardDescription>Overview of platform performance and metrics</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <AdminAnalytics />
            </CardContent>
          </Card>
        );
      case "users":
        return (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-500" />
                User Management
              </CardTitle>
              <CardDescription>Manage all user accounts and subscriptions</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <UserManagement />
            </CardContent>
          </Card>
        );
      case "roles":
        return (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <CardTitle>Role Management</CardTitle>
              <CardDescription>Assign and manage user roles across the platform</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <RoleManagement />
            </CardContent>
          </Card>
        );
      case "subscriptions":
        return <SubscriptionManagement />;
      case "doctors":
        return (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <CardTitle>Doctor Applications Management</CardTitle>
              <CardDescription>Review and manage doctor registration applications</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <DoctorApplicationsManagement />
            </CardContent>
          </Card>
        );
      case "herbal":
        return (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <CardTitle>Herbal Practitioners Management</CardTitle>
              <CardDescription>Review and manage herbal practitioner applications</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
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
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <CardTitle>Appointment Management</CardTitle>
              <CardDescription>Monitor all appointments across the platform</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <AppointmentManagement />
            </CardContent>
          </Card>
        );
      case "payments":
        return (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <CardTitle>Payment Management</CardTitle>
              <CardDescription>Track all transactions and financial data</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <PaymentManagement />
            </CardContent>
          </Card>
        );
      case "ai-logs":
        return (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <CardTitle>AI Diagnosis Logs</CardTitle>
              <CardDescription>Monitor AI diagnosis performance and accuracy</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <AIDiagnosisLogs />
            </CardContent>
          </Card>
        );
      case "blog":
        return (
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="border-b border-border/30 bg-muted/30">
              <CardTitle>Blog Management</CardTitle>
              <CardDescription>Manage blog posts and moderate comments</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="posts" className="w-full">
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="posts">Blog Posts</TabsTrigger>
                  <TabsTrigger value="comments">Comments</TabsTrigger>
                </TabsList>
                <TabsContent value="posts" className="space-y-4 mt-4">
                  <BlogManagement />
                </TabsContent>
                <TabsContent value="comments" className="space-y-4 mt-4">
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

  const statCards = [
    {
      title: "Total Doctors",
      value: stats?.totalDoctors || 0,
      subtitle: "All registered",
      icon: Users,
      color: "from-blue-500/20 to-blue-600/10",
      iconColor: "text-blue-500",
      borderColor: "border-blue-500/20",
    },
    {
      title: "Approved",
      value: stats?.approvedDoctors || 0,
      subtitle: "Active doctors",
      icon: UserCheck,
      color: "from-emerald-500/20 to-emerald-600/10",
      iconColor: "text-emerald-500",
      borderColor: "border-emerald-500/20",
    },
    {
      title: "Pending",
      value: stats?.pendingDoctors || 0,
      subtitle: "Awaiting review",
      icon: Clock,
      color: "from-amber-500/20 to-amber-600/10",
      iconColor: "text-amber-500",
      borderColor: "border-amber-500/20",
    },
    {
      title: "This Month",
      value: stats?.newApplications || 0,
      subtitle: "New applications",
      icon: TrendingUp,
      color: "from-violet-500/20 to-violet-600/10",
      iconColor: "text-violet-500",
      borderColor: "border-violet-500/20",
    },
  ];

  return (
    <>
      <DashboardTour
        run={runTour}
        onComplete={() => setRunTour(false)}
        steps={getAdminDashboardSteps()}
        userRole="admin"
      />

      <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <AdminSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          pendingCounts={pendingCounts}
        />

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 lg:p-6 pt-16 lg:pt-6 max-w-7xl">
            {/* Welcome Message */}
            <div className="mb-6 animate-fade-in">
              <WelcomeMessage
                onStartTour={() => setRunTour(true)}
                showTourButton={!userProfile?.dashboard_tour_completed}
              />
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-1 text-sm lg:text-base">
                Comprehensive platform management and oversight
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8" data-tour="stats">
              {statCards.map((stat, index) => (
                <Card 
                  key={stat.title}
                  className={cn(
                    "relative overflow-hidden border shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
                    stat.borderColor
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", stat.color)} />
                  <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className={cn("h-4 w-4", stat.iconColor)} />
                  </CardHeader>
                  <CardContent className="relative">
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <div className="text-xl lg:text-2xl font-bold">{stat.value}</div>
                    )}
                    <p className="text-[10px] lg:text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Stats Summary */}
            {pendingCounts && (pendingCounts.doctors || pendingCounts.herbalPractitioners || pendingCounts.herbalRemedies || pendingCounts.herbalArticles) ? (
              <div className="mb-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Pending Actions:</span>
                  <div className="flex flex-wrap gap-2">
                    {pendingCounts.doctors ? (
                      <span className="text-xs bg-amber-500/20 px-2 py-0.5 rounded-full">
                        {pendingCounts.doctors} doctors
                      </span>
                    ) : null}
                    {pendingCounts.herbalPractitioners ? (
                      <span className="text-xs bg-amber-500/20 px-2 py-0.5 rounded-full">
                        {pendingCounts.herbalPractitioners} practitioners
                      </span>
                    ) : null}
                    {pendingCounts.herbalRemedies ? (
                      <span className="text-xs bg-amber-500/20 px-2 py-0.5 rounded-full">
                        {pendingCounts.herbalRemedies} remedies
                      </span>
                    ) : null}
                    {pendingCounts.herbalArticles ? (
                      <span className="text-xs bg-amber-500/20 px-2 py-0.5 rounded-full">
                        {pendingCounts.herbalArticles} articles
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Content Area */}
            <div data-tour="tabs" className="animate-fade-in">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default AdminDashboard;
