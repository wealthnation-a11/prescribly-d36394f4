import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, TrendingDown, Users, Calendar, Download, CreditCard, PieChart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Cell, Pie } from "recharts";

export default function FinancialReports() {
  const [timeRange, setTimeRange] = useState("30d");

  // Fetch financial data
  const { data: financialData, isLoading } = useQuery({
    queryKey: ["admin-financial-data", timeRange],
    queryFn: async () => {
      const daysAgo = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch payments, appointments, and call logs
      const [paymentsResponse, appointmentsResponse, callLogsResponse] = await Promise.all([
        supabase.from("payments").select("*").gte("created_at", startDate.toISOString()),
        supabase.from("appointments").select("*").gte("created_at", startDate.toISOString()),
        supabase.from("call_logs").select("*").gte("created_at", startDate.toISOString())
      ]);

      const payments = paymentsResponse.data || [];
      const appointments = appointmentsResponse.data || [];
      const callLogs = callLogsResponse.data || [];

      // Calculate metrics
      const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const successfulPayments = payments.filter(p => p.status === "success");
      const totalTransactions = payments.length;
      const adminFees = callLogs.reduce((sum, log) => sum + Number(log.admin_fee || 0), 0);
      const doctorEarnings = callLogs.reduce((sum, log) => sum + Number(log.doctor_earnings || 0), 0);

      return {
        totalRevenue,
        adminFees,
        doctorEarnings,
        totalTransactions,
        successfulPayments: successfulPayments.length,
        payments,
        appointments,
        callLogs
      };
    },
  });

  // Sample chart data
  const revenueChartData = [
    { name: "Jan", revenue: 45000, fees: 9000 },
    { name: "Feb", revenue: 52000, fees: 10400 },
    { name: "Mar", revenue: 48000, fees: 9600 },
    { name: "Apr", revenue: 61000, fees: 12200 },
    { name: "May", revenue: 55000, fees: 11000 },
    { name: "Jun", revenue: 67000, fees: 13400 },
  ];

  const paymentMethodData = [
    { name: "Card", value: 65, color: "#8884d8" },
    { name: "Bank Transfer", value: 25, color: "#82ca9d" },
    { name: "Wallet", value: 10, color: "#ffc658" },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AdminLayout 
      title="Financial Reports" 
      subtitle="Monitor revenue, transactions, and financial analytics"
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
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(financialData?.totalRevenue || 0)}
              </div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Fees</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(financialData?.adminFees || 0)}
              </div>
              <div className="flex items-center text-xs text-blue-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +8% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Doctor Earnings</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(financialData?.doctorEarnings || 0)}
              </div>
              <div className="flex items-center text-xs text-purple-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +15% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financialData?.totalTransactions || 0}
              </div>
              <div className="flex items-center text-xs text-orange-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                Success Rate: {financialData?.totalTransactions ? 
                  Math.round((financialData.successfulPayments / financialData.totalTransactions) * 100) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Tables */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="payouts">Doctor Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                  <CardDescription>Monthly revenue and admin fees</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      revenue: { label: "Revenue", color: "#8884d8" },
                      fees: { label: "Admin Fees", color: "#82ca9d" }
                    }}
                    className="h-[200px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueChartData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="revenue" fill="#8884d8" />
                        <Bar dataKey="fees" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Distribution of payment methods</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      value: { label: "Percentage", color: "#8884d8" }
                    }}
                    className="h-[200px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={paymentMethodData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                        >
                          {paymentMethodData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>All payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      financialData?.payments.slice(0, 10).map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-sm">{payment.reference}</TableCell>
                          <TableCell>{formatCurrency(Number(payment.amount))}</TableCell>
                          <TableCell>
                            <Badge className={payment.status === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{payment.user_id}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <CardTitle>Doctor Payouts</CardTitle>
                <CardDescription>Earnings and payout history for doctors</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Consultation Earnings</TableHead>
                      <TableHead>Admin Fee Deducted</TableHead>
                      <TableHead>Net Payout</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                          <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      financialData?.callLogs.slice(0, 10).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>Dr. {log.doctor_id}</TableCell>
                          <TableCell>{formatCurrency(Number(log.patient_payment || 0))}</TableCell>
                          <TableCell>{formatCurrency(Number(log.admin_fee || 0))}</TableCell>
                          <TableCell>{formatCurrency(Number(log.doctor_earnings || 0))}</TableCell>
                          <TableCell>{new Date(log.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Paid</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}