import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Support from "./pages/Support";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
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
import Prescription from "./pages/Prescription";

import AIHealthCompanion from "./pages/AIHealthCompanion";
import HealthDiagnostic from "./pages/HealthDiagnostic";
import HealthChallenges from "./pages/HealthChallenges";
import HydrationChallenge from "./pages/HydrationChallenge";
import StepsChallenge from "./pages/StepsChallenge";
import SleepChallenge from "./pages/SleepChallenge";
import MindfulnessChallenge from "./pages/MindfulnessChallenge";
import GamificationProfile from "./pages/GamificationProfile";
import HealthTrendsDashboard from "./pages/HealthTrendsDashboard";
import MyPrescriptions from "./pages/MyPrescriptions";
import Subscription from "./pages/Subscription";
import PaymentCallback from "./pages/PaymentCallback";
import { SubscriptionGuard } from "./components/SubscriptionGuard";

import UserProfile from "./pages/UserProfile";
import BookAppointment from "./pages/BookAppointment";
import Chat from "./pages/Chat";
import About from "./pages/About";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Press from "./pages/Press";
import Careers from "./pages/Careers";
import JobApplication from "./pages/JobApplication";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import HipaaCompliance from "./pages/HipaaCompliance";
import AdminDashboard from "./pages/AdminDashboard";
import InstallPWA from "./pages/InstallPWA";
import NotificationHistory from "./pages/NotificationHistory";
import HerbalMedicine from "./pages/HerbalMedicine";
import BrowseRemedies from "./pages/herbal/BrowseRemedies";
import BrowseArticles from "./pages/herbal/BrowseArticles";
import FindPractitioners from "./pages/herbal/FindPractitioners";
import HerbalPractitionerDashboard from "./pages/herbal/HerbalPractitionerDashboard";
import HerbalRemedies from "./pages/herbal/HerbalRemedies";
import HerbalArticles from "./pages/herbal/HerbalArticles";
import UserHerbalConsultations from "./pages/herbal/UserHerbalConsultations";
import HerbalConsultations from "./pages/herbal/HerbalConsultations";
import HerbalMessages from "./pages/herbal/HerbalMessages";
import HerbalProfile from "./pages/herbal/HerbalProfile";
import HerbalEarnings from "./pages/herbal/HerbalEarnings";
import ShoppingCartPage from "./pages/herbal/ShoppingCartPage";
import CheckoutPage from "./pages/herbal/CheckoutPage";
import MyOrders from "./pages/herbal/MyOrders";
import PatientHerbalMessages from "./pages/herbal/PatientHerbalMessages";
import HerbalPractitionerLogin from "./pages/HerbalPractitionerLogin";
import HerbalPractitionerRegister from "./pages/HerbalPractitionerRegister";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <I18nextProvider i18n={i18n}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <PWAInstallPrompt />
              <OfflineIndicator />
              <BrowserRouter>
                <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/register-user-info-confirmation" element={<UserInfoConfirmation />} />
            <Route path="/doctor-login" element={<DoctorLogin />} />
            <Route path="/doctor-register" element={<DoctorRegister />} />
            <Route path="/register-doctor-info-confirmation" element={<DoctorInfoConfirmation />} />
            <Route path="/herbal-login" element={<HerbalPractitionerLogin />} />
            <Route path="/herbal-register" element={<HerbalPractitionerRegister />} />
            <Route path="/doctor-pending-approval" element={<DoctorPendingApproval />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/press" element={<Press />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/careers/apply/:position" element={<JobApplication />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/hipaa-compliance" element={<HipaaCompliance />} />
            <Route path="/subscription" element={
              <ProtectedRoute>
                <Subscription />
              </ProtectedRoute>
            } />
            <Route path="/payment-callback" element={<PaymentCallback />} />
            <Route path="/install" element={<InstallPWA />} />
            
            {/* Role-based Dashboard Routes */}
        <Route path="/user-dashboard" element={
          <ProtectedRoute requirePatient={true}>
            <SubscriptionGuard>
              <UserDashboard />
            </SubscriptionGuard>
          </ProtectedRoute>
        } />
            <Route path="/doctor-dashboard" element={
              <ProtectedRoute requireDoctor={true} requireApprovedDoctor={true}>
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
            <Route path="/ai-health-companion" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <AIHealthCompanion />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/health-diagnostic" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <HealthDiagnostic />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/health-challenges" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <HealthChallenges />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/health-challenges/hydration" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <HydrationChallenge />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/health-challenges/steps" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <StepsChallenge />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/health-challenges/sleep" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <SleepChallenge />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/health-challenges/mindfulness" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <MindfulnessChallenge />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/gamification-profile" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <GamificationProfile />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/health-trends" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <HealthTrendsDashboard />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <NotificationHistory />
              </ProtectedRoute>
            } />
            <Route path="/herbal-medicine" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <HerbalMedicine />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/herbal/my-consultations" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <UserHerbalConsultations />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/herbal/browse-remedies" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <BrowseRemedies />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/herbal/browse-articles" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <BrowseArticles />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/herbal/find-practitioners" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <FindPractitioners />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/herbal/cart" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <ShoppingCartPage />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/herbal/checkout" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <CheckoutPage />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/herbal/my-orders" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <MyOrders />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/herbal/patient-messages" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <PatientHerbalMessages />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/appointments" element={<Navigate to="/book-appointment" replace />} />
            <Route path="/chat" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <Chat />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/book-appointment" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <BookAppointment />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/prescription" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <Prescription />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/my-prescriptions" element={
              <ProtectedRoute requirePatient={true}>
                <SubscriptionGuard>
                  <MyPrescriptions />
                </SubscriptionGuard>
              </ProtectedRoute>
            } />
            <Route path="/support" element={
              <ProtectedRoute requirePatient={true}>
                <Support />
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
            <Route path="/doctor/patients/:patientId" element={
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

            {/* Herbal Practitioner Routes */}
            <Route path="/herbal-dashboard" element={
              <ProtectedRoute requireHerbalPractitioner={true}>
                <HerbalPractitionerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/herbal-remedies" element={
              <ProtectedRoute requireHerbalPractitioner={true}>
                <HerbalRemedies />
              </ProtectedRoute>
            } />
            <Route path="/herbal-articles" element={
              <ProtectedRoute requireHerbalPractitioner={true}>
                <HerbalArticles />
              </ProtectedRoute>
            } />
            <Route path="/herbal-consultations" element={
              <ProtectedRoute requireHerbalPractitioner={true}>
                <HerbalConsultations />
              </ProtectedRoute>
            } />
            <Route path="/herbal-messages" element={
              <ProtectedRoute requireHerbalPractitioner={true}>
                <HerbalMessages />
              </ProtectedRoute>
            } />
            <Route path="/herbal-profile" element={
              <ProtectedRoute requireHerbalPractitioner={true}>
                <HerbalProfile />
              </ProtectedRoute>
            } />
            <Route path="/herbal-earnings" element={
              <ProtectedRoute requireHerbalPractitioner={true}>
                <HerbalEarnings />
              </ProtectedRoute>
            } />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
        </I18nextProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;