import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "./StatsCard";
import {
  Users,
  UserCheck,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  Brain,
  Stethoscope,
  CheckCircle2,
} from "lucide-react";

const AdminAnalytics = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin-analytics-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-analytics", {
        body: { action: "overview" },
      });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  const stats = analytics?.stats || {};

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers || 0}
          subtitle={`+${stats.newUsersThisMonth || 0} this month`}
          icon={Users}
          gradient
        />
        <StatsCard
          title="Total Doctors"
          value={stats.totalDoctors || 0}
          subtitle={`${stats.approvedDoctors || 0} approved`}
          icon={Stethoscope}
        />
        <StatsCard
          title="Total Appointments"
          value={stats.totalAppointments || 0}
          subtitle={`${stats.completedAppointments || 0} completed`}
          icon={Calendar}
        />
        <StatsCard
          title="Platform Revenue"
          value={`₦${(stats.totalRevenue || 0).toLocaleString()}`}
          subtitle={`₦${(stats.monthlyRevenue || 0).toLocaleString()} this month`}
          icon={DollarSign}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions || 0}
          subtitle="Paid members"
          icon={UserCheck}
          gradient
        />
        <StatsCard
          title="AI Diagnoses"
          value={stats.totalDiagnoses || 0}
          subtitle={`${stats.diagnosesThisMonth || 0} this month`}
          icon={Brain}
        />
        <StatsCard
          title="Avg Confidence"
          value={`${(stats.avgAIConfidence || 0).toFixed(1)}%`}
          subtitle="AI accuracy"
          icon={Activity}
        />
        <StatsCard
          title="Growth Rate"
          value={`+${(stats.growthRate || 0).toFixed(1)}%`}
          subtitle="vs last month"
          icon={TrendingUp}
        />
      </div>

      {/* Activity and Health Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-white">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {analytics?.recentActivity?.map((activity: any, idx: number) => (
                <div key={idx} className="flex items-start gap-4 pb-4 border-b last:border-0">
                  <div className="mt-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{activity.action}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-white">
            <CardTitle className="text-lg">System Health</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="text-sm text-gray-600">API Response Time</span>
                <span className="text-sm font-semibold text-gray-900">{stats.apiResponseTime || 0}ms</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="text-sm text-gray-600">Database Health</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-semibold text-green-600">Healthy</span>
                </div>
              </div>
              <div className="flex justify-between items-center pb-4 border-b">
                <span className="text-sm text-gray-600">Error Rate</span>
                <span className="text-sm font-semibold text-gray-900">{stats.errorRate || 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="text-sm font-semibold text-gray-900">{stats.uptime || 99.9}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
