import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { DoctorRegister } from "./pages/DoctorRegister";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminLogin } from "./pages/admin/AdminLogin";
import { UsersManagement } from "./pages/admin/UsersManagement";
import { DoctorsManagement } from "./pages/admin/DoctorsManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/doctor-register" element={<DoctorRegister />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UsersManagement />} />
              <Route path="doctors" element={<DoctorsManagement />} />
              <Route path="appointments" element={<div>Appointments Management</div>} />
              <Route path="prescriptions" element={<div>Prescriptions Management</div>} />
              <Route path="transactions" element={<div>Transactions Management</div>} />
              <Route path="support" element={<div>Support Tickets</div>} />
              <Route path="logs" element={<div>System Logs</div>} />
              <Route path="settings" element={<div>Settings</div>} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
