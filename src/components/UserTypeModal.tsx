import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Stethoscope, User } from "lucide-react";
import { SignUpModal } from "./SignUpModal";
import { Logo } from "@/components/Logo";

interface UserTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserTypeModal = ({ isOpen, onClose }: UserTypeModalProps) => {
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<"patient" | "doctor">("patient");

  const handleUserTypeSelect = (userType: "patient" | "doctor") => {
    setSelectedUserType(userType);
    setShowSignUpModal(true);
  };

  const handleSignUpModalClose = () => {
    setShowSignUpModal(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen && !showSignUpModal} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-4 text-center">
            <div className="flex items-center justify-center">
              <Logo size="md" priority />
            </div>
            <DialogTitle className="text-2xl">Choose Your Account Type</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-center text-muted-foreground">
              Select the type of account you want to create
            </p>
            
            <div className="grid gap-4">
              <Button
                onClick={() => handleUserTypeSelect("patient")}
                variant="outline"
                className="h-16 text-lg font-medium hover:bg-primary/10 hover:border-primary"
              >
                <User className="w-5 h-5 mr-2" />
                I am a Patient
              </Button>
              
              <Button
                onClick={() => handleUserTypeSelect("doctor")}
                variant="outline"
                className="h-16 text-lg font-medium hover:bg-success-green/10 hover:border-success-green"
              >
                <Stethoscope className="w-5 h-5 mr-2" />
                I am a Doctor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SignUpModal
        isOpen={showSignUpModal}
        onClose={handleSignUpModalClose}
        userType={selectedUserType}
      />
    </>
  );
};