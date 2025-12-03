import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DollarSign, TrendingUp, Users, CreditCard, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Payment {
  id: string;
  user_name: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  created_at: string;
  type: string;
}

// Default exchange rate (NGN per USD) - will be updated from DB
const DEFAULT_EXCHANGE_RATE = 1550;

const PaymentManagement = () => {
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-financial", {
        body: { action: "payments" },
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: exchangeRate } = useQuery({
    queryKey: ["exchange-rate-ngn"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("rate")
        .eq("currency", "NGN")
        .single();
      if (error) return DEFAULT_EXCHANGE_RATE;
      return data?.rate || DEFAULT_EXCHANGE_RATE;
    },
  });

  const rate = exchangeRate || DEFAULT_EXCHANGE_RATE;

  // Convert NGN to USD
  const toUSD = (amountNGN: number) => amountNGN / rate;
  // Convert USD to NGN
  const toNGN = (amountUSD: number) => amountUSD * rate;

  const formatUSD = (amount: number) => `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNGN = (amount: number) => `₦${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const AmountWithTooltip = ({ amountNGN }: { amountNGN: number }) => {
    const amountUSD = toUSD(amountNGN);
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help border-b border-dashed border-muted-foreground/50">
              {formatUSD(amountUSD)}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{formatNGN(amountNGN)}</p>
            <p className="text-xs text-muted-foreground">Rate: ₦{rate.toLocaleString()}/USD</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const downloadExcel = () => {
    if (!payments) return;
    
    const worksheet = XLSX.utils.json_to_sheet(
      payments.map((payment: Payment) => ({
        User: payment.user_name,
        Type: payment.type,
        "Amount (USD)": formatUSD(toUSD(payment.amount)),
        "Amount (NGN)": formatNGN(payment.amount),
        Reference: payment.reference,
        Status: payment.status,
        Date: new Date(payment.created_at).toLocaleDateString(),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");
    XLSX.writeFile(workbook, `payments-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel file downloaded");
  };

  const downloadPDF = () => {
    if (!payments) return;
    
    const doc = new jsPDF();
    doc.text("Payment Management Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Exchange Rate: ₦${rate.toLocaleString()}/USD`, 14, 22);
    
    autoTable(doc, {
      startY: 28,
      head: [['User', 'Type', 'Amount (USD)', 'Amount (NGN)', 'Status', 'Date']],
      body: payments.map((payment: Payment) => [
        payment.user_name,
        payment.type,
        formatUSD(toUSD(payment.amount)),
        formatNGN(payment.amount),
        payment.status,
        new Date(payment.created_at).toLocaleDateString(),
      ]),
    });
    
    doc.save(`payments-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF file downloaded");
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading payment data...</div>;
  }

  const { payments = [], stats = {} } = paymentsData || {};

  // Stats are in NGN, convert to USD for display
  const totalRevenueNGN = stats.totalRevenue || 0;
  const monthlyRevenueNGN = stats.monthlyRevenue || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <p className="text-xs text-muted-foreground">
          Exchange Rate: ₦{rate.toLocaleString()}/USD • Hover amounts for NGN
        </p>
        <div className="flex gap-2">
          <Button onClick={downloadExcel} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={downloadPDF} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-2xl font-bold cursor-help">
                    {formatUSD(toUSD(totalRevenueNGN))}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{formatNGN(totalRevenueNGN)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-2xl font-bold cursor-help">
                    {formatUSD(toUSD(monthlyRevenueNGN))}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{formatNGN(monthlyRevenueNGN)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paying Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.payingUsers || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount (USD)</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No payment records found
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment: Payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.user_name}</TableCell>
                  <TableCell className="capitalize">{payment.type}</TableCell>
                  <TableCell>
                    <AmountWithTooltip amountNGN={payment.amount} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{payment.reference}</TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PaymentManagement;
