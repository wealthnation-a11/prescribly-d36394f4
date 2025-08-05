import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router-dom";
import { Calendar, Users, FileText, MessageCircle, User, Clock, TrendingUp } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DoctorSidebar } from "@/components/DoctorSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const DoctorDashboard = () => {
  const { user } = useAuth();
  const { role, isDoctor, loading: roleLoading } = useUserRole();

  // Check doctor approval status
  const { data: doctorData, isLoading: doctorLoading } = useQuery({
    queryKey: ['doctor-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      
      const { data, error } = await supabase
        .from('doctors')
        .select('verification_status')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isDoctor,
  });

  // Show loading while checking auth and role
  if (roleLoading || doctorLoading) {
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

  // TODO: TEMPORARY - Bypass approval check for testing
  // Will be reinstated after setup/testing is complete
  // Redirect if not approved
  // if (doctorData?.verification_status !== 'approved') {
  //   return <Navigate to="/doctor-pending-approval" replace />;
  // }

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-blue-50 to-indigo-100">
        <DoctorSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="relative h-24 border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 backdrop-blur-sm flex items-center px-6 shadow-sm overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
            <SidebarTrigger className="mr-4 z-10" />
            <div className="flex-1 z-10">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Welcome back, Dr. {user?.user_metadata?.first_name || "Doctor"}! 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Ready to provide excellent patient care today • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4 z-10">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-sm font-medium text-foreground">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
              
              {/* Today's Appointments */}
              <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
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
                    <p className="text-2xl font-bold text-slate-900">8</p>
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
              <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
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
                    <p className="text-2xl font-bold text-slate-900">127</p>
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
              <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    Write Prescription
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-slate-900">42</p>
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
              <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-orange-600" />
                    </div>
                    Patient Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-slate-900">5</p>
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
              <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <User className="w-5 h-5 text-indigo-600" />
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
              <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <Clock className="w-5 h-5 text-teal-600" />
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

              {/* Earnings */}
              <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-lg hover:shadow-xl transition-all duration-300 md:col-span-2 xl:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-yellow-600" />
                    </div>
                    Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-slate-900">₦150,000</p>
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
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DoctorDashboard;