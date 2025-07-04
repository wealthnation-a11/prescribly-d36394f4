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
import { UserInfoConfirmation } from "./pages/UserInfoConfirmation";
import { DoctorInfoConfirmation } from "./pages/DoctorInfoConfirmation";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminLogin } from "./pages/admin/AdminLogin";
import { UsersManagement } from "./pages/admin/UsersManagement";
import { DoctorsManagement } from "./pages/admin/DoctorsManagement";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import SymptomForm from "./pages/SymptomForm";
import AIDiagnosis from "./pages/AIDiagnosis";
import MyPrescriptions from "./pages/MyPrescriptions";
import UserProfile from "./pages/UserProfile";

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
            <Route path="/register-user-info-confirmation" element={<UserInfoConfirmation />} />
            <Route path="/doctor-register" element={<DoctorRegister />} />
            <Route path="/register-doctor-info-confirmation" element={<DoctorInfoConfirmation />} />
            
            {/* Role-based Dashboard Routes */}
            <Route path="/user-dashboard" element={
              <ProtectedRoute requirePatient={true}>
                <UserDashboard />
              </ProtectedRoute>
            } />
            <Route path="/doctor-dashboard" element={
              <ProtectedRoute requireDoctor={true}>
                <DoctorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin-dashboard" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            {/* Legacy Dashboard Route (redirects based on role) */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            {/* Patient-specific Routes */}
            <Route path="/symptom-form" element={
              <ProtectedRoute requirePatient={true}>
                <SymptomForm />
              </ProtectedRoute>
            } />
            <Route path="/ai-diagnosis" element={
              <ProtectedRoute requirePatient={true}>
                <AIDiagnosis />
              </ProtectedRoute>
            } />
            <Route path="/my-prescriptions" element={
              <ProtectedRoute requirePatient={true}>
                <MyPrescriptions />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />
            <Route path="/appointments" element={
              <ProtectedRoute requirePatient={true}>
                <div>Appointments Page - Coming Soon</div>
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute requirePatient={true}>
                <div>Chat Page - Coming Soon</div>
              </ProtectedRoute>
            } />
            <Route path="/book-appointment" element={
              <ProtectedRoute requirePatient={true}>
                <div>Book Appointment Page - Coming Soon</div>
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
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
