import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Stethoscope, Shield, FileText, MapPin, AlertTriangle, User } from "lucide-react";

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: "patient" | "doctor";
}

export const SignUpModal = ({ isOpen, onClose, userType }: SignUpModalProps) => {
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (agreed) {
      if (userType === "patient") {
        navigate("/register");
      } else {
        navigate("/doctor-register");
      }
      onClose();
    }
  };

  const handleClose = () => {
    setAgreed(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4 text-center">
          <div className="flex items-center justify-center space-x-2">
            <Stethoscope className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">Prescribly</span>
          </div>
          <DialogTitle className="text-2xl">
            {userType === "patient" ? (
              <>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Shield className="w-6 h-6 text-primary" />
                  <span>Confirm Your Information</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <FileText className="w-6 h-6 text-primary" />
                  <span>Verify Your Documents and Details</span>
                </div>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {userType === "patient" ? (
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-semibold">1</span>
                </div>
                <p className="text-foreground">
                  Make sure the information you provide is <strong>accurate and true</strong>.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <p className="text-foreground">
                  Your location will be used to <strong>match you with nearby verified doctors</strong>.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center">
                  <span className="text-destructive font-semibold">!</span>
                </div>
                <p className="text-foreground">
                  Misleading data can result in <strong>suspension or incorrect diagnosis</strong>.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-success-green/10 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-success-green" />
                </div>
                <p className="text-foreground">
                  Your data is protected by <strong>NDPR, HIPAA, and GDPR laws</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <p className="text-foreground">
                  Ensure all uploaded documents are <strong>valid and correct</strong>.
                </p>
              </div>

              <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-destructive mb-2">Falsified documents will be reported to the medical bureau.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <p className="text-foreground">
                  Your location is used to <strong>match you with patients nearby</strong>.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-success-green/10 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-success-green" />
                </div>
                <p className="text-foreground">
                  Your data is <strong>securely protected and reviewed by our team</strong>.
                </p>
              </div>
            </div>
          )}

          <div className="bg-accent/50 p-4 rounded-lg border border-accent">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="modal-agreement"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <label htmlFor="modal-agreement" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {userType === "patient" ? (
                  "I confirm that my information is accurate and I agree to Prescribly's confidentiality policy."
                ) : (
                  "I confirm that my information and documents are valid. I agree to Prescribly's verification terms."
                )}
              </label>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button 
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleContinue}
              disabled={!agreed}
              className={`flex-1 ${userType === "doctor" ? "bg-success-green hover:bg-success-green/90" : ""}`}
              variant={userType === "patient" ? "medical" : "default"}
            >
              {userType === "patient" ? "🔵 Continue to Registration" : "🟢 Continue to Doctor Registration"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};