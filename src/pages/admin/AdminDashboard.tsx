import { useEffect, useState, useCallback } from 'react';
import { Users, UserCheck, Calendar, FileText, CreditCard, TrendingUp, RefreshCw } from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalUsers: number;
  totalDoctors: number;
  totalAppointments: number;
  totalPrescriptions: number;
  totalRevenue: number;
  verifiedDoctors: number;
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    totalPrescriptions: 0,
    totalRevenue: 0,
    verifiedDoctors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      const [
        { count: totalUsers },
        { count: totalDoctors },
        { count: verifiedDoctors },
        { count: totalAppointments },
        { count: totalPrescriptions },
        { data: revenueData }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('doctors').select('*', { count: 'exact', head: true }),
        supabase.from('doctors').select('*', { count: 'exact', head: true }).eq('verification_status', 'approved'),
        supabase.from('appointments').select('*', { count: 'exact', head: true }),
        supabase.from('prescriptions').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('amount').eq('status', 'completed')
      ]);

      const totalRevenue = revenueData?.reduce((sum, transaction) => sum + Number(transaction.amount), 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        totalDoctors: totalDoctors || 0,
        totalAppointments: totalAppointments || 0,
        totalPrescriptions: totalPrescriptions || 0,
        totalRevenue,
        verifiedDoctors: verifiedDoctors || 0,
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard statistics",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
    toast({
      title: "Dashboard Updated",
      description: "Statistics refreshed successfully"
    });
  };

  useEffect(() => {
    fetchStats().finally(() => setLoading(false));
  }, [fetchStats]);

  // Set up realtime subscriptions
  useEffect(() => {
    const channels = [
      supabase
        .channel('profiles_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          fetchStats();
        })
        .subscribe(),
      
      supabase
        .channel('doctors_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'doctors' }, () => {
          fetchStats();
        })
        .subscribe(),
      
      supabase
        .channel('appointments_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
          fetchStats();
        })
        .subscribe(),
      
      supabase
        .channel('prescriptions_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, () => {
          fetchStats();
        })
        .subscribe(),
      
      supabase
        .channel('transactions_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
          fetchStats();
        })
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600 mt-2">Loading dashboard statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600 mt-2">Welcome to the Prescribly admin panel</p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <p className="text-sm text-slate-500">
              Last synced: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          description="Registered users"
        />
        <StatsCard
          title="Total Doctors"
          value={stats.totalDoctors}
          icon={UserCheck}
          description={`${stats.verifiedDoctors} verified`}
        />
        <StatsCard
          title="Appointments"
          value={stats.totalAppointments}
          icon={Calendar}
          description="Total appointments"
        />
        <StatsCard
          title="Prescriptions"
          value={stats.totalPrescriptions}
          icon={FileText}
          description="Issued prescriptions"
        />
        <StatsCard
          title="Revenue"
          value={`₦${stats.totalRevenue.toLocaleString()}`}
          icon={CreditCard}
          description="Total revenue"
        />
        <StatsCard
          title="Growth"
          value="12.5%"
          icon={TrendingUp}
          description="Monthly growth"
          trend={{ value: 12.5, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
              <div>
                <p className="font-medium text-slate-900">New doctor registration</p>
                <p className="text-sm text-slate-600">Dr. Johnson submitted KYC documents</p>
              </div>
              <span className="text-xs text-slate-500">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
              <div>
                <p className="font-medium text-slate-900">Support ticket created</p>
                <p className="text-sm text-slate-600">Payment issue reported by patient</p>
              </div>
              <span className="text-xs text-slate-500">4 hours ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded">
              <div>
                <p className="font-medium text-slate-900">Doctor verified</p>
                <p className="text-sm text-slate-600">Dr. Smith's profile approved</p>
              </div>
              <span className="text-xs text-slate-500">6 hours ago</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full p-3 text-left bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors">
              Review pending doctor applications
            </button>
            <button className="w-full p-3 text-left bg-orange-50 text-orange-700 rounded hover:bg-orange-100 transition-colors">
              Handle support tickets
            </button>
            <button className="w-full p-3 text-left bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
              Generate monthly report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};