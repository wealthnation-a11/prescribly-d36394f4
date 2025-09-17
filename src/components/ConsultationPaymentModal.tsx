import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertCircle } from 'lucide-react';
import { useConsultationPayment } from '@/hooks/useConsultationPayment';

interface ConsultationPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  appointmentId: string;
  doctorName?: string;
}

export const ConsultationPaymentModal = ({ 
  isOpen, 
  onClose, 
  onPaymentSuccess, 
  appointmentId,
  doctorName 
}: ConsultationPaymentModalProps) => {
  const { initializePayment, loading } = useConsultationPayment();
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);
    
    try {
      const paymentUrl = await initializePayment(appointmentId);
      
      if (paymentUrl) {
        // Store callback info for when user returns
        localStorage.setItem('consultation_payment_callback', JSON.stringify({
          appointmentId,
          action: 'consultation_payment'
        }));
        
        // Redirect to Paystack
        window.location.href = paymentUrl;
      }
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            <span>Consultation Payment Required</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              To start your consultation with {doctorName ? `Dr. ${doctorName}` : 'your doctor'}, 
              you need to pay the consultation fee.
            </p>
            <div className="flex items-center justify-between border-t border-border pt-2 mt-2">
              <span className="font-medium">Consultation Fee:</span>
              <span className="text-lg font-bold text-primary">$10</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">What's included:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>✓ Direct chat access with your doctor</li>
              <li>✓ Video/voice call capabilities</li>
              <li>✓ Secure medical consultation</li>
              <li>✓ Prescription if needed</li>
            </ul>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={processing || loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={processing || loading}
              className="flex-1"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {processing || loading ? 'Processing...' : 'Pay $10'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Secure payment powered by Paystack
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};