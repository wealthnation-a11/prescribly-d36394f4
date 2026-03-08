import { lazy, Suspense } from "react";
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
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SubscriptionGuard } from "./components/SubscriptionGuard";

// Eagerly load the landing page for fast first paint
import Index from "./pages/Index";

// Lazy-loaded pages
const NotFound = lazy(() => import("./pages/NotFound"));
const Support = lazy(() => import("./pages/Support"));
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const Register = lazy(() => import("./pages/Register").then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword").then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("./pages/ResetPassword").then(m => ({ default: m.ResetPassword })));
const DoctorLogin = lazy(() => import("./pages/DoctorLogin").then(m => ({ default: m.DoctorLogin })));
const DoctorRegister = lazy(() => import("./pages/DoctorRegister").then(m => ({ default: m.DoctorRegister })));
const UserInfoConfirmation = lazy(() => import("./pages/UserInfoConfirmation").then(m => ({ default: m.UserInfoConfirmation })));
const DoctorInfoConfirmation = lazy(() => import("./pages/DoctorInfoConfirmation").then(m => ({ default: m.DoctorInfoConfirmation })));
const DoctorPendingApproval = lazy(() => import("./pages/DoctorPendingApproval").then(m => ({ default: m.DoctorPendingApproval })));
const DoctorAppointments = lazy(() => import("./pages/doctor/DoctorAppointments"));
const DoctorPatients = lazy(() => import("./pages/doctor/DoctorPatients"));
const DoctorPrescriptions = lazy(() => import("./pages/doctor/DoctorPrescriptions"));
const PendingPrescriptionReview = lazy(() => import("./components/doctor/PendingPrescriptionReview"));
const DoctorMessages = lazy(() => import("./pages/doctor/DoctorMessages"));
const DoctorProfile = lazy(() => import("./pages/doctor/DoctorProfile"));
const DoctorAvailability = lazy(() => import("./pages/doctor/DoctorAvailability"));
const DoctorEarnings = lazy(() => import("./pages/doctor/DoctorEarnings"));
const DoctorHomeVisits = lazy(() => import("./pages/doctor/DoctorHomeVisits"));
const PatientDetails = lazy(() => import("./pages/doctor/PatientDetails"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const DoctorDashboard = lazy(() => import("./pages/DoctorDashboard"));
const Prescription = lazy(() => import("./pages/Prescription"));
const AIHealthCompanion = lazy(() => import("./pages/AIHealthCompanion"));
const HealthDiagnostic = lazy(() => import("./pages/HealthDiagnostic"));
const HealthChallenges = lazy(() => import("./pages/HealthChallenges"));
const HydrationChallenge = lazy(() => import("./pages/HydrationChallenge"));
const StepsChallenge = lazy(() => import("./pages/StepsChallenge"));
const SleepChallenge = lazy(() => import("./pages/SleepChallenge"));
const MindfulnessChallenge = lazy(() => import("./pages/MindfulnessChallenge"));
const GamificationProfile = lazy(() => import("./pages/GamificationProfile"));
const HealthTrendsDashboard = lazy(() => import("./pages/HealthTrendsDashboard"));
const MyPrescriptions = lazy(() => import("./pages/MyPrescriptions"));
const Subscription = lazy(() => import("./pages/Subscription"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const BookAppointment = lazy(() => import("./pages/BookAppointment"));
const BookingModeSelector = lazy(() => import("./pages/BookingModeSelector"));
const ChatWithDoctor = lazy(() => import("./pages/booking/ChatWithDoctor"));
const HomeVisit = lazy(() => import("./pages/booking/HomeVisit"));
const FacilityVisit = lazy(() => import("./pages/booking/FacilityVisit"));
const Chat = lazy(() => import("./pages/Chat"));
const About = lazy(() => import("./pages/About"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Press = lazy(() => import("./pages/Press"));
const Careers = lazy(() => import("./pages/Careers"));
const JobApplication = lazy(() => import("./pages/JobApplication"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Cookies = lazy(() => import("./pages/Cookies"));
const HipaaCompliance = lazy(() => import("./pages/HipaaCompliance"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const InstallPWA = lazy(() => import("./pages/InstallPWA"));
const NotificationHistory = lazy(() => import("./pages/NotificationHistory"));
const HerbalMedicine = lazy(() => import("./pages/HerbalMedicine"));
const BrowseRemedies = lazy(() => import("./pages/herbal/BrowseRemedies"));
const BrowseArticles = lazy(() => import("./pages/herbal/BrowseArticles"));
const FindPractitioners = lazy(() => import("./pages/herbal/FindPractitioners"));
const HerbalPractitionerDashboard = lazy(() => import("./pages/herbal/HerbalPractitionerDashboard"));
const HerbalRemedies = lazy(() => import("./pages/herbal/HerbalRemedies"));
const HerbalArticles = lazy(() => import("./pages/herbal/HerbalArticles"));
const UserHerbalConsultations = lazy(() => import("./pages/herbal/UserHerbalConsultations"));
const HerbalConsultations = lazy(() => import("./pages/herbal/HerbalConsultations"));
const HerbalMessages = lazy(() => import("./pages/herbal/HerbalMessages"));
const HerbalProfile = lazy(() => import("./pages/herbal/HerbalProfile"));
const HerbalEarnings = lazy(() => import("./pages/herbal/HerbalEarnings"));
const ShoppingCartPage = lazy(() => import("./pages/herbal/ShoppingCartPage"));
const CheckoutPage = lazy(() => import("./pages/herbal/CheckoutPage"));
const MyOrders = lazy(() => import("./pages/herbal/MyOrders"));
const PatientHerbalMessages = lazy(() => import("./pages/herbal/PatientHerbalMessages"));
const HerbalPractitionerLogin = lazy(() => import("./pages/HerbalPractitionerLogin"));
const HerbalPractitionerRegister = lazy(() => import("./pages/HerbalPractitionerRegister"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Shared loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  </div>
);

// Wrapper for subscription-guarded patient routes
const PatientRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute requirePatient>
    <SubscriptionGuard>{children}</SubscriptionGuard>
  </ProtectedRoute>
);

// Wrapper for approved doctor routes
const DoctorRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute requireDoctor requireApprovedDoctor>
    {children}
  </ProtectedRoute>
);

// Wrapper for herbal practitioner routes
const HerbalRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute requireHerbalPractitioner>
    {children}
  </ProtectedRoute>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <I18nextProvider i18n={i18n}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <PWAInstallPrompt />
              <OfflineIndicator />
              <RealtimeNotifications />
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public Routes */}
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
                    <Route path="/payment-callback" element={<PaymentCallback />} />
                    <Route path="/install" element={<InstallPWA />} />

                    {/* Auth-only Routes */}
                    <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute><NotificationHistory /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                    {/* Patient Routes */}
                    <Route path="/user-dashboard" element={<PatientRoute><UserDashboard /></PatientRoute>} />
                    <Route path="/ai-health-companion" element={<PatientRoute><AIHealthCompanion /></PatientRoute>} />
                    <Route path="/health-diagnostic" element={<PatientRoute><HealthDiagnostic /></PatientRoute>} />
                    <Route path="/health-challenges" element={<PatientRoute><HealthChallenges /></PatientRoute>} />
                    <Route path="/health-challenges/hydration" element={<PatientRoute><HydrationChallenge /></PatientRoute>} />
                    <Route path="/health-challenges/steps" element={<PatientRoute><StepsChallenge /></PatientRoute>} />
                    <Route path="/health-challenges/sleep" element={<PatientRoute><SleepChallenge /></PatientRoute>} />
                    <Route path="/health-challenges/mindfulness" element={<PatientRoute><MindfulnessChallenge /></PatientRoute>} />
                    <Route path="/gamification-profile" element={<PatientRoute><GamificationProfile /></PatientRoute>} />
                    <Route path="/health-trends" element={<PatientRoute><HealthTrendsDashboard /></PatientRoute>} />
                    <Route path="/chat" element={<PatientRoute><Chat /></PatientRoute>} />
                    <Route path="/book-appointment" element={<PatientRoute><BookingModeSelector /></PatientRoute>} />
                    <Route path="/book-appointment/chat" element={<PatientRoute><ChatWithDoctor /></PatientRoute>} />
                    <Route path="/book-appointment/home-visit" element={<PatientRoute><HomeVisit /></PatientRoute>} />
                    <Route path="/book-appointment/facility" element={<PatientRoute><FacilityVisit /></PatientRoute>} />
                    <Route path="/prescription" element={<PatientRoute><Prescription /></PatientRoute>} />
                    <Route path="/my-prescriptions" element={<PatientRoute><MyPrescriptions /></PatientRoute>} />
                    <Route path="/appointments" element={<Navigate to="/book-appointment" replace />} />
                    <Route path="/support" element={<ProtectedRoute requirePatient><Support /></ProtectedRoute>} />

                    {/* Doctor Routes */}
                    <Route path="/doctor-dashboard" element={<ProtectedRoute requireDoctor requireApprovedDoctor><DoctorDashboard /></ProtectedRoute>} />
                    <Route path="/doctor/appointments" element={<DoctorRoute><DoctorAppointments /></DoctorRoute>} />
                    <Route path="/doctor/patients" element={<DoctorRoute><DoctorPatients /></DoctorRoute>} />
                    <Route path="/doctor/patients/:patientId" element={<DoctorRoute><PatientDetails /></DoctorRoute>} />
                    <Route path="/doctor/prescriptions" element={<DoctorRoute><DoctorPrescriptions /></DoctorRoute>} />
                    <Route path="/doctor/pending-prescriptions" element={<DoctorRoute><PendingPrescriptionReview /></DoctorRoute>} />
                    <Route path="/doctor/messages" element={<DoctorRoute><DoctorMessages /></DoctorRoute>} />
                    <Route path="/doctor/profile" element={<ProtectedRoute requireDoctor><DoctorProfile /></ProtectedRoute>} />
                    <Route path="/doctor/availability" element={<DoctorRoute><DoctorAvailability /></DoctorRoute>} />
                    <Route path="/doctor/home-visits" element={<DoctorRoute><DoctorHomeVisits /></DoctorRoute>} />
                    <Route path="/doctor/earnings" element={<DoctorRoute><DoctorEarnings /></DoctorRoute>} />

                    {/* Admin Routes */}
                    <Route path="/admin-dashboard" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />

                    {/* Herbal Practitioner Routes */}
                    <Route path="/herbal-dashboard" element={<HerbalRoute><HerbalPractitionerDashboard /></HerbalRoute>} />
                    <Route path="/herbal-remedies" element={<HerbalRoute><HerbalRemedies /></HerbalRoute>} />
                    <Route path="/herbal-articles" element={<HerbalRoute><HerbalArticles /></HerbalRoute>} />
                    <Route path="/herbal-consultations" element={<HerbalRoute><HerbalConsultations /></HerbalRoute>} />
                    <Route path="/herbal-messages" element={<HerbalRoute><HerbalMessages /></HerbalRoute>} />
                    <Route path="/herbal-profile" element={<HerbalRoute><HerbalProfile /></HerbalRoute>} />
                    <Route path="/herbal-earnings" element={<HerbalRoute><HerbalEarnings /></HerbalRoute>} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </I18nextProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
