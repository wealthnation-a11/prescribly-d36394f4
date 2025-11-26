import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, Navigate } from 'react-router-dom';
import { Leaf, FileText, Calendar, DollarSign, Users, MessageSquare, User, TrendingUp } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { HerbalPractitionerSidebar } from '@/components/HerbalPractitionerSidebar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHerbalPractitioner } from '@/hooks/useHerbalPractitioner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WelcomeMessage } from '@/components/WelcomeMessage';
import { formatUSD } from '@/utils/currency';

const HerbalPractitionerDashboard = () => {
  const { user, userProfile } = useAuth();
  const { practitioner, isApproved, isPending, isLoading } = useHerbalPractitioner();
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

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['herbal-stats', practitioner?.id],
    queryFn: async () => {
      if (!practitioner?.id) return null;

      const [remediesRes, articlesRes, consultationsRes, approvedRemediesRes, approvedArticlesRes] = await Promise.all([
        supabase.from('herbal_remedies').select('*', { count: 'exact', head: true }).eq('practitioner_id', practitioner.id),
        supabase.from('herbal_articles').select('*', { count: 'exact', head: true }).eq('practitioner_id', practitioner.id),
        supabase.from('herbal_consultations').select('*', { count: 'exact', head: true }).eq('practitioner_id', practitioner.id),
        supabase.from('herbal_remedies').select('*', { count: 'exact', head: true }).eq('practitioner_id', practitioner.id).eq('approval_status', 'approved'),
        supabase.from('herbal_articles').select('*', { count: 'exact', head: true }).eq('practitioner_id', practitioner.id).eq('approval_status', 'approved'),
      ]);

      return {
        totalRemedies: remediesRes.count || 0,
        totalArticles: articlesRes.count || 0,
        totalConsultations: consultationsRes.count || 0,
        approvedRemedies: approvedRemediesRes.count || 0,
        approvedArticles: approvedArticlesRes.count || 0,
      };
    },
    enabled: !!practitioner?.id && isApproved,
  });

  // Show loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show pending approval message
  if (isPending) {
    return (
      <SidebarProvider defaultOpen>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-green-50 to-emerald-100">
          <HerbalPractitionerSidebar />
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <Alert>
                <AlertDescription>
                  Your herbal practitioner application is pending approval. You'll be notified once an admin reviews your application.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // Show rejection message
  if (!isApproved && !isPending) {
    return (
      <SidebarProvider defaultOpen>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-green-50 to-emerald-100">
          <HerbalPractitionerSidebar />
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <Alert variant="destructive">
                <AlertDescription>
                  Your herbal practitioner application was not approved. Please contact support for more information.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-green-50 to-emerald-100">
        <HerbalPractitionerSidebar />
      
        <div className="flex-1 flex flex-col">
          {/* Enhanced Welcome Header */}
          <header className="relative h-32 border-b bg-gradient-to-br from-green-600/10 via-emerald-50 to-teal-50 backdrop-blur-sm flex items-center px-6 shadow-lg overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-teal-500/5"></div>
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-6 right-20 w-32 h-32 bg-green-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
              <div className="absolute top-10 right-40 w-24 h-24 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
              <div className="absolute bottom-6 right-60 w-20 h-20 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
            </div>
            
            <SidebarTrigger className="mr-6 z-10 hover:scale-110 transition-transform duration-200" />
            
            <div className="flex-1 z-10">
              {/* Main Welcome Message */}
              <div className="mb-3">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent animate-fade-in flex items-center gap-3">
                  Welcome back, {practitioner?.first_name || "Practitioner"}!
                  <span className="text-3xl animate-bounce">🌿</span>
                </h1>
              </div>
              
              {/* Subtitle with Enhanced Styling */}
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse"></div>
                <p className="text-base font-medium">
                  Ready to share natural healing wisdom
                </p>
                <span className="text-slate-400">•</span>
                <p className="text-base font-medium text-green-600">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            
            {/* Enhanced Time Display */}
            <div className="hidden md:flex items-center gap-4 z-10">
              <div className="text-right bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/30 shadow-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Current Time</p>
                <p className="text-lg font-bold text-slate-700">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Welcome Message */}
              <WelcomeMessage 
                onStartTour={() => setRunTour(true)}
                showTourButton={!userProfile?.dashboard_tour_completed}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              
                {/* Total Remedies */}
                <Card className="backdrop-blur-sm bg-green-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-slate-900">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Leaf className="w-5 h-5 text-green-600" />
                      </div>
                      My Remedies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-2xl font-bold text-slate-900">{stats?.approvedRemedies || 0}</p>
                      <p className="text-sm text-slate-600">approved / {stats?.totalRemedies || 0} total</p>
                    </div>
                    <p className="text-slate-600 mb-4 text-sm">
                      Manage your herbal remedies and products.
                    </p>
                    <Button asChild className="w-full">
                      <Link to="/herbal-remedies">Manage Remedies</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Total Articles */}
                <Card className="backdrop-blur-sm bg-emerald-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-slate-900">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <FileText className="w-5 h-5 text-emerald-600" />
                      </div>
                      My Articles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-2xl font-bold text-slate-900">{stats?.approvedArticles || 0}</p>
                      <p className="text-sm text-slate-600">approved / {stats?.totalArticles || 0} total</p>
                    </div>
                    <p className="text-slate-600 mb-4 text-sm">
                      Share your knowledge through articles.
                    </p>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/herbal-articles">Manage Articles</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Consultations */}
                <Card className="backdrop-blur-sm bg-teal-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-slate-900">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-teal-600" />
                      </div>
                      Consultations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-2xl font-bold text-slate-900">{stats?.totalConsultations || 0}</p>
                      <p className="text-sm text-slate-600">total bookings</p>
                    </div>
                    <p className="text-slate-600 mb-4 text-sm">
                      View and manage client consultations.
                    </p>
                    <Button asChild className="w-full">
                      <Link to="/herbal-consultations">View Schedule</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Messages */}
                <Card className="backdrop-blur-sm bg-purple-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-slate-900">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-purple-600" />
                      </div>
                      Messages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-2xl font-bold text-slate-900">0</p>
                      <p className="text-sm text-slate-600">unread messages</p>
                    </div>
                    <p className="text-slate-600 mb-4 text-sm">
                      Communicate with your clients.
                    </p>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/herbal-messages">View Messages</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Profile */}
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
                      <p className="text-sm text-slate-600">100% completed</p>
                    </div>
                    <p className="text-slate-600 mb-4 text-sm">
                      Update your professional information.
                    </p>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/herbal-profile">Edit Profile</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Earnings */}
                <Card className="backdrop-blur-sm bg-amber-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-slate-900">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-amber-600" />
                      </div>
                      Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-2xl font-bold text-slate-900">{formatUSD(0)}</p>
                      <p className="text-sm text-slate-600">this month</p>
                    </div>
                    <p className="text-slate-600 mb-4 text-sm">
                      Track your consultation earnings.
                    </p>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/herbal-earnings">View Earnings</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default HerbalPractitionerDashboard;
