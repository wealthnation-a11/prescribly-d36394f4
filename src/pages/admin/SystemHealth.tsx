import { SystemHealthDashboard } from "@/components/admin/SystemHealthDashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { usePageSEO } from "@/hooks/usePageSEO";

export default function SystemHealth() {
  usePageSEO({
    title: "System Health Dashboard - Admin Panel | PrescriblyAI",
    description: "Monitor system performance, AI validation metrics, and quality assurance for the diagnostic platform."
  });

  return (
    <ProtectedRoute requireAdmin={true}>
      <SystemHealthDashboard />
    </ProtectedRoute>
  );
}