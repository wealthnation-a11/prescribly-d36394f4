import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Users, TrendingUp, Clock, AlertTriangle, CheckCircle, Download, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, LineChart, Line } from "recharts";

export default function SystemAnalytics() {
  const [timeRange, setTimeRange] = useState("7d");

  // Fetch system analytics data
  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ["admin-analytics", timeRange],
    queryFn: async () => {
      const daysAgo = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch various metrics
      const [
        usersResponse,
        appointmentsResponse,
        diagnosticsResponse,
        monitoringLogsResponse
      ] = await Promise.all([
        supabase.from("profiles").select("created_at, role").gte("created_at", startDate.toISOString()),
        supabase.from("appointments").select("created_at, status").gte("created_at", startDate.toISOString()),
        supabase.from("diagnosis_history").select("created_at").gte("created_at", startDate.toISOString()),
        supabase.from("monitoring_logs").select("*").gte("created_at", startDate.toISOString()).limit(100)
      ]);

      const users = usersResponse.data || [];
      const appointments = appointmentsResponse.data || [];
      const diagnostics = diagnosticsResponse.data || [];
      const monitoringLogs = monitoringLogsResponse.data || [];

      // Calculate engagement metrics
      const activeUsers = users.length;
      const totalAppointments = appointments.length;
      const successfulAppointments = appointments.filter(apt => apt.status === "completed").length;
      const diagnosticSessions = diagnostics.length;

      // Error rate from monitoring logs
      const totalLogs = monitoringLogs.length;
      const errorLogs = monitoringLogs.filter(log => !log.success).length;
      const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;

      // Average response time
      const avgResponseTime = monitoringLogs
        .filter(log => log.latency_ms)
        .reduce((sum, log) => sum + log.latency_ms, 0) / 
        (monitoringLogs.filter(log => log.latency_ms).length || 1);

      return {
        activeUsers,
        totalAppointments,
        successfulAppointments,
        diagnosticSessions,
        errorRate,
        avgResponseTime: Math.round(avgResponseTime),
        monitoringLogs,
        users,
        appointments
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds for real-time feel
  });

  // Sample chart data for better visualization
  const userGrowthData = [
    { name: "Mon", users: 120, active: 85 },
    { name: "Tue", users: 132, active: 95 },
    { name: "Wed", users: 145, active: 102 },
    { name: "Thu", users: 158, active: 108 },
    { name: "Fri", users: 171, active: 125 },
    { name: "Sat", users: 185, active: 140 },
    { name: "Sun", users: 195, active: 155 },
  ];

  const performanceData = [
    { name: "00:00", responseTime: 245, uptime: 99.9 },
    { name: "06:00", responseTime: 189, uptime: 99.8 },
    { name: "12:00", responseTime: 312, uptime: 99.7 },
    { name: "18:00", responseTime: 298, uptime: 99.9 },
    { name: "24:00", responseTime: 223, uptime: 100 },
  ];

  const featureUsageData = [
    { name: "AI Diagnosis", usage: 245, trend: "+12%" },
    { name: "Appointments", usage: 189, trend: "+8%" },
    { name: "Prescriptions", usage: 156, trend: "+15%" },
    { name: "Health Challenges", usage: 134, trend: "+22%" },
    { name: "Chat Support", usage: 98, trend: "+5%" },
  ];

  return (
    <AdminLayout 
      title="System Analytics" 
      subtitle="Monitor platform performance and user engagement"
      showBackButton
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex justify-between items-center">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.activeUsers || 0}</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +15% from last period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData?.totalAppointments ? 
                  Math.round((analyticsData.successfulAppointments / analyticsData.totalAppointments) * 100) : 0}%
              </div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                Appointment completion rate
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.avgResponseTime || 0}ms</div>
              <div className="flex items-center text-xs text-orange-600 mt-1">
                <Activity className="h-3 w-3 mr-1" />
                System response time
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.errorRate?.toFixed(2) || 0}%</div>
              <div className="flex items-center text-xs text-red-600 mt-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                System error rate
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="engagement" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="engagement">User Engagement</TabsTrigger>
            <TabsTrigger value="performance">System Performance</TabsTrigger>
            <TabsTrigger value="features">Feature Usage</TabsTrigger>
            <TabsTrigger value="realtime">Real-time Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="engagement" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                  <CardDescription>Total and active users over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      users: { label: "Total Users", color: "#8884d8" },
                      active: { label: "Active Users", color: "#82ca9d" }
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={userGrowthData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="users" stackId="1" stroke="#8884d8" fill="#8884d8" />
                        <Area type="monotone" dataKey="active" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Diagnostic Sessions</CardTitle>
                  <CardDescription>AI diagnosis usage over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="text-3xl font-bold text-primary">
                      {analyticsData?.diagnosticSessions || 0}
                    </div>
                    <p className="text-muted-foreground mt-2">Total sessions in selected period</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>System Performance Metrics</CardTitle>
                <CardDescription>Response time and uptime monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    responseTime: { label: "Response Time (ms)", color: "#8884d8" },
                    uptime: { label: "Uptime %", color: "#82ca9d" }
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="responseTime" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="uptime" stroke="#82ca9d" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>Feature Usage Analytics</CardTitle>
                <CardDescription>Most used platform features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {featureUsageData.map((feature, index) => (
                    <div key={feature.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{feature.name}</h4>
                        <p className="text-sm text-muted-foreground">{feature.usage} users</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{feature.trend}</Badge>
                        <div className="w-20 h-2 bg-muted rounded-full">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${(feature.usage / 245) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="realtime">
            <Card>
              <CardHeader>
                <CardTitle>Real-time System Monitoring</CardTitle>
                <CardDescription>Live system events and alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="w-3 h-3 bg-muted rounded-full animate-pulse" />
                        <div className="flex-1">
                          <div className="h-4 bg-muted animate-pulse rounded mb-2" />
                          <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                        </div>
                      </div>
                    ))
                  ) : (
                    analyticsData?.monitoringLogs.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className={`w-3 h-3 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{log.event_type}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {log.error_message || "Event completed successfully"}
                            {log.latency_ms && ` • ${log.latency_ms}ms`}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}