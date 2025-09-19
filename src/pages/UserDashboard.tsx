import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionCountdownTimer } from "@/components/SubscriptionCountdownTimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Stethoscope, 
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
  Trophy,
  Crown,
  HelpCircle
} from "lucide-react";
import { MobileHeader } from "@/components/MobileHeader";
import EnhancedRecentActivity from "@/components/EnhancedRecentActivity";
import { AppointmentCard } from "@/components/AppointmentCard";
import { DailyHealthTip } from "@/components/DailyHealthTip";
import { useUserDashboardStats } from '@/hooks/useUserDashboardStats';
import { FeatureAccessGuard } from "@/components/FeatureAccessGuard";

import { 
  SidebarProvider, 
  SidebarTrigger,
  SidebarInset 
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeAppointments } from "@/hooks/useRealtimeAppointments";

export const UserDashboard = () => {
  const { user, userProfile } = useAuth();
  const { role } = useUserRole();
  const { stats, loading: statsLoading, error } = useUserDashboardStats();
  const { subscription, hasActiveSubscription, getDaysUntilExpiry, loading: subscriptionLoading, isLegacyUser, refreshSubscription } = useSubscription();
  const [searchParams] = useSearchParams();
  
  // Real-time subscriptions
  useRealtimeAppointments('patient');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  const loading = statsLoading || appointmentsLoading;

  const quickActions = [
    {
      title: "Health Diagnostic",
      description: "Professional symptom assessment tool with structured medical questionnaires and detailed diagnosis reports.",
      icon: Stethoscope,
      href: "/health-diagnostic",
      variant: "primary" as const,
      color: "text-emerald-600"
    },
    {
      title: "Health Companion", 
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

  // Fetch Recent Appointments for display
  const fetchRecentAppointments = async () => {
    if (!user?.id) return [];

    try {
      setAppointmentsLoading(true);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_time,
          status,
          doctor_id,
          notes,
          consultation_fee
        `)
        .eq('patient_id', user.id)
        .in('status', ['approved', 'completed'])
        .order('scheduled_time', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Fetch doctor profiles separately
      const appointmentsWithDoctors = await Promise.all(
        (data || []).map(async (appointment) => {
          const { data: doctorProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', appointment.doctor_id)
            .maybeSingle();

          return {
            ...appointment,
            doctor: {
              profiles: doctorProfile
            }
          };
        })
      );

      setAppointments(appointmentsWithDoctors);
    } catch (error) {
      console.error('Error fetching recent appointments:', error);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchRecentAppointments();
    }
  }, [user?.id]);

  // Handle payment success callback
  useEffect(() => {
    const handlePaymentCallback = async () => {
      const paymentSuccess = searchParams.get('payment');
      const reference = searchParams.get('trxref');
      
      if (paymentSuccess === 'success' && reference) {
        try {
          // Verify payment
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke('paystack-verify', {
            body: { reference }
          });

          if (verifyError || !verifyData.status) {
            throw new Error(verifyData?.message || 'Payment verification failed');
          }

          toast({
            title: "Payment Successful",
            description: "Your subscription has been activated!",
          });

          // Refresh subscription data
          await refreshSubscription();
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
        } catch (error) {
          console.error('Payment verification failed:', error);
          toast({
            title: "Payment Verification Failed",
            description: "Please contact support if your payment was deducted.",
            variant: "destructive"
          });
        }
      }
    };

    handlePaymentCallback();
  }, [searchParams, refreshSubscription]);

  // Show subscription status for non-legacy users
  const getSubscriptionStatus = () => {
    if (userProfile?.role === 'doctor') return null;
    if (userProfile?.is_legacy) {
      return (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Free Lifetime Access</span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">Legacy User</Badge>
          </CardContent>
        </Card>
      );
    }

    if (hasActiveSubscription && subscription) {
      const daysLeft = getDaysUntilExpiry;
      const isExpiringSoon = daysLeft <= 7;
      
      return (
        <Card className={`border-2 ${isExpiringSoon ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className={`h-5 w-5 ${isExpiringSoon ? 'text-yellow-600' : 'text-green-600'}`} />
              <div>
                <span className={`font-medium ${isExpiringSoon ? 'text-yellow-800' : 'text-green-800'}`}>
                  Active Subscription
                </span>
                <p className={`text-sm ${isExpiringSoon ? 'text-yellow-600' : 'text-green-600'}`}>
                  {daysLeft} days remaining • {subscription.plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/subscription">Manage</Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const formatNextAppointment = (appointment: typeof stats.nextAppointment) => {
    if (!appointment || !appointment.appointmentDate) {
      return {
        value: "None",
        trend: "No upcoming appointments"
      };
    }

    const date = new Date(appointment.appointmentDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const appointmentDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    let dateText;
    if (appointmentDay.getTime() === today.getTime()) {
      dateText = "Today";
    } else if (appointmentDay.getTime() === tomorrow.getTime()) {
      dateText = "Tomorrow";
    } else {
      dateText = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }

    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const statusIcon = appointment.status === 'approved' ? '✅' : '⏳';
    const statusText = appointment.status === 'approved' ? 'Approved' : 'Pending';

    return {
      value: dateText,
      trend: `${formattedTime} • ${appointment.doctorName || 'Doctor'} • ${statusIcon} ${statusText}`
    };
  };

  const getStatsCards = () => {
    if (loading) {
      return [
        { title: "Total Consultations", loading: true, icon: Activity, color: "text-primary", href: "/book-appointment" },
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
        title: "Next Appointment",
        value: nextAppointmentInfo.value,
        icon: Clock,
        trend: nextAppointmentInfo.trend,
        color: "text-green-600",
        href: (stats.nextAppointment && stats.nextAppointment.status === 'approved') ? "/chat" : "/book-appointment",
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
              <Button onClick={() => window.location.reload()}>Try Again</Button>
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
          <MobileHeader title="Dashboard" />

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-8">
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
              {/* Subscription Status */}
              {getSubscriptionStatus() && (
                <div>
                  {getSubscriptionStatus()}
                </div>
              )}

              {/* Subscription Countdown Timer for New Users */}
              {!isLegacyUser && hasActiveSubscription && subscription && (
                <SubscriptionCountdownTimer 
                  expirationDate={subscription.expires_at}
                  daysRemaining={getDaysUntilExpiry}
                  isActive={hasActiveSubscription}
                />
              )}

              {/* Daily Health Tip */}
              <DailyHealthTip />

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <FeatureAccessGuard key={action.title} featureName={action.title}>
                      <Card className="dashboard-card hover-scale fade-in-up" style={{ animationDelay: `${(index + 3) * 0.1}s` }}>
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
                            size="lg"
                          >
                            <Link to={action.href}>
                              Get Started
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </FeatureAccessGuard>
                  ))}
                </div>
              </div>

              {/* Recent Appointments */}
              {!appointmentsLoading && appointments.length > 0 && (
                <div>
                  <h2 className="text-heading text-foreground mb-6">Recent Appointments</h2>
                  <div className="grid gap-4">
                    {appointments.slice(0, 3).map((appointment, index) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={{
                          ...appointment,
                          patient: {
                            first_name: userProfile?.first_name || '',
                            last_name: userProfile?.last_name || '',
                            avatar_url: userProfile?.avatar_url || null
                          }
                        }}
                      />
                    ))}
                  </div>
                  <div className="text-center mt-6">
                    <Button asChild variant="outline" size="lg">
                      <Link to="/book-appointment">View All Appointments</Link>
                    </Button>
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div>
                <h2 className="text-heading text-foreground mb-6">Recent Activity</h2>
                <EnhancedRecentActivity />
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default UserDashboard;