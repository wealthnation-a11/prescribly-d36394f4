import { usePageSEO } from "@/hooks/usePageSEO";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DoctorApplicationsManagement from "@/components/admin/DoctorApplicationsManagement";
import { HerbalPractitionersManagement } from "@/components/admin/HerbalPractitionersManagement";
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
import { Users, UserCheck, Clock, TrendingUp, Home } from "lucide-react";
import { WelcomeMessage } from "@/components/WelcomeMessage";
import { DashboardTour, getAdminDashboardSteps } from "@/components/DashboardTour";

const AdminDashboard = () => {
  const { userProfile } = useAuth();
  const [runTour, setRunTour] = useState(false);

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

  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-analytics", {
        body: { action: "dashboard-stats" },
      });
      if (error) throw error;
      return data.stats;
    },
  });

  return (
    <>
      <DashboardTour
        run={runTour}
        onComplete={() => setRunTour(false)}
        steps={getAdminDashboardSteps()}
        userRole="admin"
      />
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <Home className="h-4 w-4" />
                View Landing Page
              </Button>
            </Link>
          </div>
          
          <div className="mb-8">
            <WelcomeMessage 
              onStartTour={() => setRunTour(true)}
              showTourButton={!userProfile?.dashboard_tour_completed}
            />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive platform management and oversight
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" data-tour="stats">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalDoctors || 0}</div>
              <p className="text-xs text-muted-foreground">All registered doctors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.approvedDoctors || 0}</div>
              <p className="text-xs text-muted-foreground">Active doctors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingDoctors || 0}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.newApplications || 0}</div>
              <p className="text-xs text-muted-foreground">New applications</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="analytics" className="w-full" data-tour="tabs">
          <TabsList className="grid w-full grid-cols-9" data-tour="tabs-list">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="herbal">Herbal Practitioners</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="ai-logs">AI Diagnosis</TabsTrigger>
            <TabsTrigger value="blog">Blog</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Analytics</CardTitle>
                <CardDescription>
                  Overview of platform performance and metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminAnalytics />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage all user accounts and subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Management</CardTitle>
                <CardDescription>
                  Assign and manage user roles across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RoleManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-6">
            <SubscriptionManagement />
          </TabsContent>

          <TabsContent value="doctors" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Doctor Applications Management</CardTitle>
                <CardDescription>
                  Review and manage doctor registration applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DoctorApplicationsManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="herbal" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Herbal Practitioners Management</CardTitle>
                <CardDescription>
                  Review and manage herbal practitioner applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HerbalPractitionersManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Management</CardTitle>
                <CardDescription>
                  Monitor all appointments across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AppointmentManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Management</CardTitle>
                <CardDescription>
                  Track all transactions and financial data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-logs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Diagnosis Logs</CardTitle>
                <CardDescription>
                  Monitor AI diagnosis performance and accuracy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AIDiagnosisLogs />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blog" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Blog Management</CardTitle>
                <CardDescription>
                  Manage blog posts and moderate comments
                </CardDescription>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
};

export default AdminDashboard;