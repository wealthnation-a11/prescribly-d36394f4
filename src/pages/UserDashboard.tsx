import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
  Shield,
  Loader2,
  Brain,
  Trophy
} from "lucide-react";
import { RecentActivity } from "@/components/RecentActivity";
import ActivityLog from "@/components/ActivityLog";
import { 
  SidebarProvider, 
  SidebarTrigger,
  SidebarInset 
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalConsultations: number;
  activePrescriptions: number;
  nextAppointment: {
    doctorName?: string;
    appointmentDate?: string;
  } | null;
}

export const UserDashboard = () => {
  const { user, userProfile } = useAuth();
  const { role } = useUserRole();
  const [stats, setStats] = useState<DashboardStats>({
    totalConsultations: 0,
    activePrescriptions: 0,
    nextAppointment: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const quickActions = [
    {
      title: "Wellness Checker",
      description: "Complete health assessment with AI-powered diagnosis and prescriptions.",
      icon: Stethoscope,
      href: "/wellness-checker",
      variant: "primary" as const,
      color: "text-primary"
    },
    {
      title: "AI Health Companion",
      description: "Interactive AI companion with progressive diagnosis and personalized treatment.",
      icon: Brain,
      href: "/ai-health-companion",
      variant: "primary" as const,
      color: "text-purple-600"
    },
    {
      title: "Health Challenges",
      description: "Join community wellness challenges, track progress, and earn points.",
      icon: Trophy,
      href: "/health-challenges",
      variant: "outline" as const,
      color: "text-yellow-600"
    },
    {
      title: "Chat with Doctors",
      description: "Connect with healthcare professionals instantly.",
      icon: MessageCircle,
      href: "/chat",
      variant: "outline" as const,
      color: "text-green-600"
    }
  ];

  // Fetch Total Consultations
  const fetchTotalConsultations = async () => {
    if (!user?.id) return 0;
    
    const { count, error } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', user.id)
      .eq('status', 'completed');

    if (error) {
      console.error('Error fetching consultations:', error);
      return 0;
    }

    return count || 0;
  };

  // Fetch Active Prescriptions  
  const fetchActivePrescriptions = async () => {
    if (!user?.id) return 0;

    const { count, error } = await supabase
      .from('wellness_check_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching prescriptions:', error);
      return 0;
    }

    return count || 0;
  };

  // Fetch Next Appointment
  const fetchNextAppointment = async () => {
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        scheduled_time,
        doctors!inner(
          id,
          specialization
        ),
        profiles!appointments_doctor_id_fkey(
          first_name,
          last_name
        )
      `)
      .eq('patient_id', user.id)
      .in('status', ['pending', 'scheduled'])
      .gte('scheduled_time', new Date().toISOString())
      .order('scheduled_time', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Error fetching next appointment:', error);
      return null;
    }

    if (data && data.length > 0) {
      const appointment = data[0];
      const profile = appointment.profiles as any;
      const doctorName = profile ? `Dr. ${profile.first_name} ${profile.last_name}` : 'Doctor';
      
      return {
        doctorName,
        appointmentDate: appointment.scheduled_time
      };
    }

    return null;
  };

  // Load all dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [consultations, prescriptions, nextAppointment] = await Promise.all([
        fetchTotalConsultations(),
        fetchActivePrescriptions(),
        fetchNextAppointment()
      ]);

      setStats({
        totalConsultations: consultations,
        activePrescriptions: prescriptions,
        nextAppointment
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription for appointments
  useEffect(() => {
    if (!user?.id) return;

    loadDashboardData();

    const channel = supabase
      .channel('appointments-realtime')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'appointments', 
          filter: `patient_id=eq.${user.id}` 
        },
        (payload) => {
          console.log('Appointment change detected:', payload);
          // Re-fetch appointments data
          fetchNextAppointment().then(nextAppointment => {
            setStats(prev => ({ ...prev, nextAppointment }));
          });
          
          // Re-fetch consultations if status changed to completed
          if (payload.new && (payload.new as any).status === 'completed') {
            fetchTotalConsultations().then(totalConsultations => {
              setStats(prev => ({ ...prev, totalConsultations }));
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const formatNextAppointment = (appointment: typeof stats.nextAppointment) => {
    if (!appointment || !appointment.appointmentDate) {
      return {
        value: "None",
        trend: "No upcoming appointments"
      };
    }

    const date = new Date(appointment.appointmentDate);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return {
      value: `${formattedDate}`,
      trend: `${formattedTime} with ${appointment.doctorName || 'Doctor'}`
    };
  };

  const getStatsCards = () => {
    if (loading) {
      return [
        { title: "Total Consultations", loading: true, icon: Activity, color: "text-primary", href: "/book-appointment" },
        { title: "Active Prescriptions", loading: true, icon: FileText, color: "text-blue-600", href: "/wellness-checker" },
        { title: "Next Appointment", loading: true, icon: Clock, color: "text-green-600", href: "/book-appointment" }
      ];
    }

    const nextAppointmentInfo = formatNextAppointment(stats.nextAppointment);

    return [
      {
        title: "Total Consultations",
        value: stats.totalConsultations.toString(),
        icon: Activity,
        trend: stats.totalConsultations > 0 ? "Completed consultations" : "No consultations yet",
        color: "text-primary",
        href: "/book-appointment",
        empty: stats.totalConsultations === 0
      },
      {
        title: "Active Prescriptions",
        value: stats.activePrescriptions.toString(),
        icon: FileText,
        trend: stats.activePrescriptions > 0 ? "Available prescriptions" : "No prescriptions found",
        color: "text-blue-600",
        href: "/prescription",
        empty: stats.activePrescriptions === 0
      },
      {
        title: "Next Appointment",
        value: nextAppointmentInfo.value,
        icon: Clock,
        trend: nextAppointmentInfo.trend,
        color: "text-green-600",
        href: stats.nextAppointment ? "/chat" : "/book-appointment",
        empty: !stats.nextAppointment
      }
    ];
  };

  if (role !== 'patient') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">This dashboard is only accessible to patients.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Error Loading Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={loadDashboardData}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                  <Card 
                    key={stat.title} 
                    className={`dashboard-card fade-in-up cursor-pointer hover:shadow-lg transition-all duration-200 ${
                      (stat as any).href ? 'hover:border-primary/30' : ''
                    }`} 
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {(stat as any).href ? (
                      <Link to={(stat as any).href} className="block">
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
                      </Link>
                    ) : (
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
                    )}
                  </Card>
                ))}
              </div>

              {/* Quick Actions */}
              <div>
                <h2 className="text-heading text-foreground mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
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
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2">
                   <h2 className="text-heading text-foreground mb-6">Recent Activity</h2>
                   <ActivityLog limit={10} showTitle={false} />
                 </div>
               </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default UserDashboard;