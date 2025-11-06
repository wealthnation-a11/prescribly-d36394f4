import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Users, CreditCard, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const downloadExcel = () => {
    if (!payments) return;
    
    const worksheet = XLSX.utils.json_to_sheet(
      payments.map((payment: Payment) => ({
        User: payment.user_name,
        Type: payment.type,
        Amount: `${payment.currency} ${payment.amount}`,
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
    
    (doc as any).autoTable({
      startY: 25,
      head: [['User', 'Type', 'Amount', 'Reference', 'Status', 'Date']],
      body: payments.map((payment: Payment) => [
        payment.user_name,
        payment.type,
        `${payment.currency} ${payment.amount}`,
        payment.reference,
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

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 mb-4">
        <Button onClick={downloadExcel} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Excel
        </Button>
        <Button onClick={downloadPDF} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          PDF
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.totalRevenue?.toLocaleString() || 0}</div>
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
            <div className="text-2xl font-bold">₦{stats.monthlyRevenue?.toLocaleString() || 0}</div>
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment: Payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.user_name}</TableCell>
                <TableCell className="capitalize">{payment.type}</TableCell>
                <TableCell>
                  {payment.currency} {payment.amount.toLocaleString()}
                </TableCell>
                <TableCell className="font-mono text-xs">{payment.reference}</TableCell>
                <TableCell>{getStatusBadge(payment.status)}</TableCell>
                <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PaymentManagement;
