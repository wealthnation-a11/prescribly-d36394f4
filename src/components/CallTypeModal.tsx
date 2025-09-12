import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Video, Phone, X } from "lucide-react";

interface CallTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'voice' | 'video') => void;
  doctorName?: string;
}

export function CallTypeModal({ isOpen, onClose, onSelectType, doctorName }: CallTypeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Start Call with {doctorName || 'Doctor'}
          </DialogTitle>
          <DialogDescription>
            Choose your preferred call type to begin the consultation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={() => onSelectType('video')}
            variant="outline"
            className="h-16 justify-start gap-4 text-left hover:bg-primary/5"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">Video Call</div>
              <div className="text-sm text-muted-foreground">See and talk to your doctor</div>
            </div>
          </Button>
          
          <Button
            onClick={() => onSelectType('voice')}
            variant="outline"
            className="h-16 justify-start gap-4 text-left hover:bg-primary/5"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">Voice Call</div>
              <div className="text-sm text-muted-foreground">Audio-only consultation</div>
            </div>
          </Button>
        </div>

        <Button
          onClick={onClose}
          variant="ghost"
          className="mt-4"
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}