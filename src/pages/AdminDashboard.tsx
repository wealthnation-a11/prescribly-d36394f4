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
import { Search, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";

const AdminDashboard = () => {
  usePageSEO({
    title: "Admin Dashboard - Prescribly",
    description: "Administrative dashboard for managing the entire platform",
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AdminSidebar />
        
        <main className="flex-1 flex flex-col">
          {/* Header with gradient */}
          <header className="sticky top-0 z-10 bg-gradient-to-r from-[hsl(var(--admin-gradient-start))] to-[hsl(var(--admin-gradient-end))] text-white">
            <div className="flex items-center gap-4 px-6 py-4">
              <SidebarTrigger className="text-white hover:bg-white/20" />
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input 
                    placeholder="Search..." 
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-gray-50">
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
