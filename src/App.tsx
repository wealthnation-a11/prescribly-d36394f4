import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { DoctorLogin } from "./pages/DoctorLogin";
import { DoctorRegister } from "./pages/DoctorRegister";
import { UserInfoConfirmation } from "./pages/UserInfoConfirmation";
import { DoctorInfoConfirmation } from "./pages/DoctorInfoConfirmation";
import { DoctorPendingApproval } from "./pages/DoctorPendingApproval";
import DoctorAppointments from "./pages/doctor/DoctorAppointments";
import DoctorPatients from "./pages/doctor/DoctorPatients";
import DoctorPrescriptions from "./pages/doctor/DoctorPrescriptions";
import DoctorMessages from "./pages/doctor/DoctorMessages";
import DoctorProfile from "./pages/doctor/DoctorProfile";
import DoctorAvailability from "./pages/doctor/DoctorAvailability";
import DoctorEarnings from "./pages/doctor/DoctorEarnings";
import PatientDetails from "./pages/doctor/PatientDetails";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import SymptomForm from "./pages/SymptomForm";
import AIDiagnosis from "./pages/AIDiagnosis";
import MyPrescriptions from "./pages/MyPrescriptions";
import UserProfile from "./pages/UserProfile";
import BookAppointment from "./pages/BookAppointment";
import Chat from "./pages/Chat";

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
            <Route path="/doctor-login" element={<DoctorLogin />} />
            <Route path="/doctor-register" element={<DoctorRegister />} />
            <Route path="/register-doctor-info-confirmation" element={<DoctorInfoConfirmation />} />
            <Route path="/doctor-pending-approval" element={<DoctorPendingApproval />} />
            
            {/* Role-based Dashboard Routes */}
            <Route path="/user-dashboard" element={
              <ProtectedRoute requirePatient={true}>
                <UserDashboard />
              </ProtectedRoute>
            } />
            <Route path="/doctor-dashboard" element={
              <ProtectedRoute requireDoctor={true} requireApprovedDoctor={true}>
                <DoctorDashboard />
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
                <Chat />
              </ProtectedRoute>
            } />
            <Route path="/book-appointment" element={
              <ProtectedRoute requirePatient={true}>
                <BookAppointment />
              </ProtectedRoute>
            } />

            {/* Doctor-specific Routes */}
            <Route path="/doctor/appointments" element={
              <ProtectedRoute requireDoctor={true} requireApprovedDoctor={true}>
                <DoctorAppointments />
              </ProtectedRoute>
            } />
            <Route path="/doctor/patients" element={
              <ProtectedRoute requireDoctor={true} requireApprovedDoctor={true}>
                <DoctorPatients />
              </ProtectedRoute>
            } />
            <Route path="/doctor/patient/:id" element={
              <ProtectedRoute requireDoctor={true} requireApprovedDoctor={true}>
                <PatientDetails />
              </ProtectedRoute>
            } />
            <Route path="/doctor/prescriptions" element={
              <ProtectedRoute requireDoctor={true} requireApprovedDoctor={true}>
                <DoctorPrescriptions />
              </ProtectedRoute>
            } />
            <Route path="/doctor/messages" element={
              <ProtectedRoute requireDoctor={true} requireApprovedDoctor={true}>
                <DoctorMessages />
              </ProtectedRoute>
            } />
            <Route path="/doctor/profile" element={
              <ProtectedRoute requireDoctor={true}>
                <DoctorProfile />
              </ProtectedRoute>
            } />
            <Route path="/doctor/availability" element={
              <ProtectedRoute requireDoctor={true} requireApprovedDoctor={true}>
                <DoctorAvailability />
              </ProtectedRoute>
            } />
            <Route path="/doctor/earnings" element={
              <ProtectedRoute requireDoctor={true} requireApprovedDoctor={true}>
                <DoctorEarnings />
              </ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
