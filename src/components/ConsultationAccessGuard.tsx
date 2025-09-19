import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConsultationPayment } from '@/hooks/useConsultationPayment';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Lock, Crown, MessageCircle, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConsultationPaymentModal } from '@/components/ConsultationPaymentModal';

interface ConsultationAccessGuardProps {
  children: React.ReactNode;
  appointmentId: string;
  doctorName?: string;
  featureType: 'chat' | 'call';
}

export const ConsultationAccessGuard = ({ 
  children, 
  appointmentId, 
  doctorName, 
  featureType 
}: ConsultationAccessGuardProps) => {
  const { user, userProfile } = useAuth();
  const { hasPaymentForAppointment } = useConsultationPayment();
  const { isAdmin } = useUserRole();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has paid for this specific appointment
  useEffect(() => {
    const checkPayment = async () => {
      if (!appointmentId || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        const paid = await hasPaymentForAppointment(appointmentId);
        setHasPaid(paid);
      } catch (error) {
        console.error('Error checking consultation payment:', error);
        setHasPaid(false);
      } finally {
        setLoading(false);
      }
    };

    checkPayment();
  }, [appointmentId, user?.id, hasPaymentForAppointment]);

  // Admin users have full access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Doctors don't need to pay for consultation access
  if (userProfile?.role === 'doctor') {
    return <>{children}</>;
  }

  // Legacy users get free consultation access
  if (userProfile?.is_legacy) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If user hasn't paid for this appointment, show payment prompt
  if (!hasPaid) {
    const FeatureIcon = featureType === 'chat' ? MessageCircle : Phone;
    const featureName = featureType === 'chat' ? 'Chat' : 'Call';

    return (
      <>
        <div 
          onClick={() => setShowPaymentModal(true)}
          className="cursor-pointer transition-all duration-200 hover:opacity-80"
        >
          {children}
        </div>

        <ConsultationPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={() => {
            setHasPaid(true);
            setShowPaymentModal(false);
          }}
          appointmentId={appointmentId}
          doctorName={doctorName}
        />
      </>
    );
  }

  // User has paid, allow access
  return <>{children}</>;
};