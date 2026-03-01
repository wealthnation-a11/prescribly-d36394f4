import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useDoctorEarnings } from "@/hooks/useDoctorEarnings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router-dom";
import { Calendar, Users, FileText, MessageCircle, User, Clock, TrendingUp, Brain, Pill } from "lucide-react";
import { DoctorLayout } from "@/components/DoctorLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatUSD } from "@/utils/currency";
import { WelcomeMessage } from "@/components/WelcomeMessage";
import { DashboardTour, getDoctorDashboardSteps } from "@/components/DashboardTour";

import { useRealtimeAppointments } from "@/hooks/useRealtimeAppointments";
import { useRealtimePrescriptions } from "@/hooks/useRealtimePrescriptions";
import EnhancedRecentActivity from "@/components/EnhancedRecentActivity";


export const DoctorDashboard = () => {
  const { user, userProfile } = useAuth();
  const { role, isDoctor, loading: roleLoading } = useUserRole();
  const { earnings, loading: earningsLoading } = useDoctorEarnings();
  const [runTour, setRunTour] = useState(false);
  
  // Check if user should see tour
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
  
  // Real-time subscriptions
  useRealtimeAppointments('doctor');
  useRealtimePrescriptions('doctor');

  // Fetch today's appointments count
  const { data: todayAppointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['today-appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', user.id)
        .gte('scheduled_time', startOfDay.toISOString())
        .lte('scheduled_time', endOfDay.toISOString());
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch total unique patients count
  const { data: totalPatients = 0 } = useQuery({
    queryKey: ['total-patients', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { data, error } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('doctor_id', user.id)
        .eq('status', 'completed');
      
      if (error) throw error;
      
      // Count unique patients
      const uniquePatients = new Set(data?.map(apt => apt.patient_id) || []);
      return uniquePatients.size;
    },
    enabled: !!user?.id,
  });

  // Fetch prescriptions count
  const { data: prescriptionsCount = 0 } = useQuery({
    queryKey: ['prescriptions-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { count, error } = await supabase
        .from('prescriptions')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', user.id)
        .gte('created_at', startOfMonth.toISOString());
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Fetch pending drug approvals count
  const { data: pendingApprovalsCount = 0 } = useQuery({
    queryKey: ['pending-approvals-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { count, error } = await supabase
        .from('pending_drug_approvals')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'under_review']);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Fetch unread messages count  
  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['unread-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { count, error } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Show loading while checking auth and role
  if (roleLoading || appointmentsLoading || earningsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect non-doctors
  if (!isDoctor) {
    return <Navigate to="/doctor-login" replace />;
  }

  return (
    <>
      <DashboardTour
        run={runTour}
        onComplete={() => setRunTour(false)}
        steps={getDoctorDashboardSteps()}
        userRole="doctor"
      />
      
      <DoctorLayout 
        title={`Welcome back, Dr. ${user?.user_metadata?.first_name || "Doctor"}!`}
        subtitle="Ready to provide excellent patient care today"
        showBackButton={false}
      >
        <div className="space-y-6">
          {/* Welcome Message */}
          <WelcomeMessage 
            onStartTour={() => setRunTour(true)}
            showTourButton={!userProfile?.dashboard_tour_completed}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              
              {/* Today's Appointments */}
              <Card className="backdrop-blur-sm bg-blue-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    Today's Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-slate-900">{todayAppointments.length}</p>
                    <p className="text-sm text-slate-600">appointments scheduled</p>
                  </div>
                  <p className="text-slate-600 mb-4 text-sm">
                    View and manage your scheduled appointments for today.
                  </p>
                  <Button asChild className="w-full">
                    <Link to="/doctor/appointments">View Schedule</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* My Patients */}
              <Card className="backdrop-blur-sm bg-blue-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300" data-tour="patients">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    My Patients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-slate-900">{totalPatients}</p>
                    <p className="text-sm text-slate-600">total patients</p>
                  </div>
                  <p className="text-slate-600 mb-4 text-sm">
                    Access patient records and medical histories.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/doctor/patients">Manage Patients</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Write Prescription */}
              <Card className="backdrop-blur-sm bg-green-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    Write Prescription
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-slate-900">{prescriptionsCount}</p>
                    <p className="text-sm text-slate-600">this month</p>
                  </div>
                  <p className="text-slate-600 mb-4 text-sm">
                    Create and manage prescriptions for your patients.
                  </p>
                  <Button asChild className="w-full">
                    <Link to="/doctor/prescriptions">New Prescription</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Patient Messages */}
              <Card className="backdrop-blur-sm bg-purple-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-purple-600" />
                    </div>
                    Patient Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-slate-900">{unreadMessages}</p>
                    <p className="text-sm text-slate-600">unread messages</p>
                  </div>
                  <p className="text-slate-600 mb-4 text-sm">
                    Communicate with patients via chat or call.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/doctor/messages">View Messages</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* My Profile */}
              <Card className="backdrop-blur-sm bg-gray-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    My Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-slate-900">Profile Complete</p>
                    <p className="text-sm text-slate-600">90% completed</p>
                  </div>
                  <p className="text-slate-600 mb-4 text-sm">
                    Update your professional information and credentials.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/doctor/profile">Edit Profile</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Availability */}
              <Card className="backdrop-blur-sm bg-orange-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300" data-tour="availability">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    Availability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-slate-900">Status: Available</p>
                    <p className="text-sm text-slate-600">9:00 AM - 5:00 PM</p>
                  </div>
                  <p className="text-slate-600 mb-4 text-sm">
                    Manage your working hours and availability.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/doctor/availability">Set Schedule</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* AI Diagnoses / Pending Prescriptions */}
              <Card className="backdrop-blur-sm bg-purple-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Pill className="w-5 h-5 text-purple-600" />
                    </div>
                    Pending Prescriptions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-slate-900">{pendingApprovalsCount}</p>
                    <p className="text-sm text-slate-600">pending review</p>
                  </div>
                  <p className="text-slate-600 mb-4 text-sm">
                    Review AI-recommended medications for patients.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/doctor/pending-prescriptions">Review Prescriptions</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Earnings */}
              <Card className="backdrop-blur-sm bg-teal-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300" data-tour="earnings">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-teal-600" />
                    </div>
                    Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-slate-900">{formatUSD(earnings.monthlyEarnings)}</p>
                    <p className="text-sm text-slate-600">this month</p>
                  </div>
                  <p className="text-slate-600 mb-4 text-sm">
                    Track your weekly and monthly earnings.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/doctor/earnings">View Earnings</Link>
                  </Button>
                </CardContent>
              </Card>
          </div>
          
          {/* Recent Activity Section */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Recent Activity</h2>
            <EnhancedRecentActivity />
          </div>
        </div>
      </DoctorLayout>
    </>
  );
};

export default DoctorDashboard;