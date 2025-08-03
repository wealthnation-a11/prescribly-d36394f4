import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Stethoscope, 
  FileText, 
  Calendar, 
  MessageCircle, 
  User, 
  BookOpen,
  Activity,
  TrendingUp,
  Clock,
  Shield
} from "lucide-react";
import { RecentActivity } from "@/components/RecentActivity";
import { 
  SidebarProvider, 
  SidebarTrigger,
  SidebarInset 
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";

export const UserDashboard = () => {
  const { user, userProfile } = useAuth();
  const { role } = useUserRole();
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats();

  const quickActions = [
    {
      title: "AI Diagnosis",
      description: "Get instant AI-powered health insights based on your symptoms.",
      icon: Stethoscope,
      href: "/symptom-form",
      variant: "primary" as const,
      color: "text-primary"
    },
    {
      title: "My Prescriptions",
      description: "View and manage your current and past prescriptions.",
      icon: FileText,
      href: "/my-prescriptions",
      variant: "outline" as const,
      color: "text-blue-600"
    },
    {
      title: "Chat with Doctors",
      description: "Connect with healthcare professionals instantly.",
      icon: MessageCircle,
      href: "/chat",
      variant: "outline" as const,
      color: "text-purple-600"
    }
  ];

  // Create dynamic stats cards based on fetched data
  const getStatsCards = () => {
    if (statsLoading) {
      return [
        { title: "Total Consultations", loading: true, icon: Activity, color: "text-primary" },
        { title: "Active Prescriptions", loading: true, icon: FileText, color: "text-blue-600" },
        { title: "Next Appointment", loading: true, icon: Clock, color: "text-green-600" }
      ];
    }

    return [
      {
        title: "Total Consultations",
        value: stats.totalConsultations > 0 ? stats.totalConsultations.toString() : "0",
        icon: Activity,
        trend: stats.totalConsultations > 0 ? 
          (stats.consultationsThisMonth > 0 ? `+${stats.consultationsThisMonth} this month` : "No consultations this month") :
          "No consultations yet",
        color: "text-primary",
        empty: stats.totalConsultations === 0
      },
      {
        title: "Active Prescriptions",
        value: stats.activePrescriptions > 0 ? stats.activePrescriptions.toString() : "0",
        icon: FileText,
        trend: stats.activePrescriptions > 0 ?
          (stats.expiringPrescriptions > 0 ? `${stats.expiringPrescriptions} expiring soon` : "None expiring soon") :
          "No prescriptions found",
        color: "text-blue-600",
        empty: stats.activePrescriptions === 0
      },
      {
        title: "Next Appointment",
        value: stats.nextAppointment ? stats.nextAppointment.date || "Scheduled" : "None",
        icon: Clock,
        trend: stats.nextAppointment ? 
          `${stats.nextAppointment.time || ''} ${stats.nextAppointment.doctorName ? 'with ' + stats.nextAppointment.doctorName : ''}`.trim() :
          "No appointments yet",
        color: "text-green-600",
        empty: !stats.nextAppointment
      }
    ];
  };

  const statsCards = getStatsCards();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1">
              <h1 className="text-heading text-foreground">Dashboard</h1>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {/* Welcome Banner */}
            <div className="welcome-banner text-white p-8">
              <div className="container mx-auto relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold mb-1">
                      Welcome back, {userProfile?.first_name || user?.user_metadata?.first_name || "User"}!
                    </h1>
                    <p className="text-white/90 text-content">
                      Manage your health journey with our comprehensive platform
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="container mx-auto p-6 space-y-8">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statsCards.map((stat, index) => (
                  <Card key={stat.title} className="dashboard-card fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-content text-muted-foreground mb-1">{stat.title}</p>
                          {(stat as any).loading ? (
                            <>
                              <Skeleton className="h-8 w-16 mb-2" />
                              <Skeleton className="h-3 w-24" />
                            </>
                          ) : (
                            <>
                              <p className={`text-2xl font-bold ${(stat as any).empty ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {(stat as any).value}
                              </p>
                              <p className={`text-xs mt-1 ${(stat as any).empty ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                                {(stat as any).trend}
                              </p>
                            </>
                          )}
                        </div>
                        <div className="icon-container">
                          <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Quick Actions */}
              <div>
                <h2 className="text-heading text-foreground mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {quickActions.map((action, index) => (
                    <Card key={action.title} className="dashboard-card hover-scale fade-in-up" style={{ animationDelay: `${(index + 3) * 0.1}s` }}>
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3 text-lg">
                          <div className="icon-container">
                            <action.icon className={`w-5 h-5 ${action.color}`} />
                          </div>
                          {action.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-content text-muted-foreground mb-6 leading-relaxed">
                          {action.description}
                        </p>
                        <Button 
                          asChild 
                          variant={action.variant === "primary" ? "medical" : "outline"}
                          className="w-full hover-scale"
                        >
                          <Link to={action.href} className="inline-flex items-center justify-center gap-2">
                            Get Started
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h2 className="text-heading text-foreground mb-6">Recent Activity</h2>
                <RecentActivity />
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default UserDashboard;