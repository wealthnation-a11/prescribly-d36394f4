import { usePageSEO } from "@/hooks/usePageSEO";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import UserManagement from "@/components/admin/UserManagement";
import { RoleManagement } from "@/components/admin/RoleManagement";
import { SubscriptionManagement } from "@/components/admin/SubscriptionManagement";
import DoctorApplicationsManagement from "@/components/admin/DoctorApplicationsManagement";
import AppointmentManagement from "@/components/admin/AppointmentManagement";
import PaymentManagement from "@/components/admin/PaymentManagement";
import AIDiagnosisLogs from "@/components/admin/AIDiagnosisLogs";

const AdminDashboard = () => {
  usePageSEO({
    title: "Admin Dashboard - Prescribly",
    description: "Administrative dashboard for managing the entire platform",
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        
        <main className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-xl font-semibold">Admin Dashboard</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            <div className="container mx-auto p-6">
              <Routes>
                <Route index element={<AdminAnalytics />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="roles" element={<RoleManagement />} />
                <Route path="subscriptions" element={<SubscriptionManagement />} />
                <Route path="doctors" element={<DoctorApplicationsManagement />} />
                <Route path="appointments" element={<AppointmentManagement />} />
                <Route path="payments" element={<PaymentManagement />} />
                <Route path="ai-diagnosis" element={<AIDiagnosisLogs />} />
                <Route path="*" element={<Navigate to="/admin-dashboard" replace />} />
              </Routes>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
