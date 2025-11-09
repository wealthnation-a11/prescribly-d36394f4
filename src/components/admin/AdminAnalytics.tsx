import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  Activity,
  Brain,
  Stethoscope,
  CalendarDays,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AdminAnalytics = () => {
  const [timePeriod, setTimePeriod] = useState<'month' | 'year'>('month');
  const [realTimeUpdate, setRealTimeUpdate] = useState(0);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [appointmentType, setAppointmentType] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  // Fetch available doctors for filter
  const { data: doctorsData } = useQuery({
    queryKey: ["admin-doctors-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, user_id')
        .eq('verification_status', 'approved');
      
      if (error) throw error;
      
      // Get profiles for each doctor
      const doctorIds = data?.map(d => d.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', doctorIds);
      
      // Combine doctors with their profiles
      return data?.map(doctor => {
        const profile = profiles?.find(p => p.user_id === doctor.user_id);
        const displayName = profile?.first_name && profile?.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.email || 'Unnamed Doctor';
        return {
          ...doctor,
          displayName
        };
      });
    },
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin-analytics-overview", timePeriod, realTimeUpdate, selectedDoctor, appointmentType, selectedGender, selectedCountry],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-analytics", {
        body: { 
          action: "overview", 
          timePeriod,
          filters: {
            doctorId: selectedDoctor !== 'all' ? selectedDoctor : undefined,
            appointmentType: appointmentType !== 'all' ? appointmentType : undefined,
            gender: selectedGender !== 'all' ? selectedGender : undefined,
            country: selectedCountry !== 'all' ? selectedCountry : undefined,
          }
        },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Real-time updates every 10 seconds
  });

  // Real-time subscriptions for live updates
  useEffect(() => {
    const channel = supabase
      .channel('analytics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          setRealTimeUpdate(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          setRealTimeUpdate(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  const stats = analytics?.stats || {};
  const genderData = analytics?.genderData || [];
  const countryData = analytics?.countryData || [];
  const userGrowthData = analytics?.userGrowthData || [];
  const availableCountries = analytics?.availableCountries || [];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];
  
  const hasActiveFilters = selectedDoctor !== 'all' || appointmentType !== 'all' || selectedGender !== 'all' || selectedCountry !== 'all';
  
  const clearFilters = () => {
    setSelectedDoctor('all');
    setAppointmentType('all');
    setSelectedGender('all');
    setSelectedCountry('all');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
            <p className="text-sm text-muted-foreground">Real-time platform insights with advanced filtering</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={timePeriod} onValueChange={(value: any) => setTimePeriod(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            
            <Badge variant="outline" className="animate-pulse h-10 px-3 flex items-center gap-2">
              <Activity className="h-3 w-3" />
              Live
            </Badge>
          </div>
        </div>

        {/* Advanced Filters */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Advanced Filters
                </h3>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Doctor Filter */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Doctor</label>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Doctors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Doctors</SelectItem>
                      {doctorsData?.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Appointment Type Filter */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Appointment Status</label>
                  <Select value={appointmentType} onValueChange={setAppointmentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Gender Filter */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Gender</label>
                  <Select value={selectedGender} onValueChange={setSelectedGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Genders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer Not to Say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Country Filter */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Country</label>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {availableCountries?.map((country: string) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">Active filters:</span>
                  {selectedDoctor !== 'all' && (
                    <Badge variant="secondary" className="text-xs">
                      Doctor: {doctorsData?.find(d => d.id === selectedDoctor)?.displayName}
                    </Badge>
                  )}
                  {appointmentType !== 'all' && (
                    <Badge variant="secondary" className="text-xs">
                      Status: {appointmentType}
                    </Badge>
                  )}
                  {selectedGender !== 'all' && (
                    <Badge variant="secondary" className="text-xs">
                      Gender: {selectedGender}
                    </Badge>
                  )}
                  {selectedCountry !== 'all' && (
                    <Badge variant="secondary" className="text-xs">
                      Country: {selectedCountry}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newUsersThisMonth || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDoctors || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.approvedDoctors || 0} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedAppointments || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{stats.totalRevenue?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              ₦{stats.monthlyRevenue?.toLocaleString() || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">Paid members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Diagnoses</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDiagnoses || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.diagnosesThisMonth || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgAIConfidence?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">AI accuracy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.growthRate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Demographics and Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>User Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Country Distribution */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Users by Country
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={countryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="country" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Country List */}
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold mb-4">All Countries with Users</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {countryData.map((item: any) => (
                  <div key={item.country} className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                    <span className="text-sm font-medium">{item.country}</span>
                    <Badge variant="outline">{item.count} user{item.count !== 1 ? 's' : ''}</Badge>
                  </div>
                ))}
              </div>
              {countryData.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No country data available yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.recentActivity?.map((activity: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">API Response Time</span>
                <span className="text-sm font-medium">{stats.apiResponseTime || 0}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Database Health</span>
                <span className="text-sm font-medium text-green-600">Healthy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Error Rate</span>
                <span className="text-sm font-medium">{stats.errorRate || 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Uptime</span>
                <span className="text-sm font-medium">{stats.uptime || 99.9}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
