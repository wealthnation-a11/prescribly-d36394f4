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
      <DialogContent className="sm:max-w-md animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            Start Call with {doctorName || 'Doctor'}
          </DialogTitle>
          <DialogDescription className="text-base">
            Choose your preferred call type to begin the consultation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 mt-6">
          <Button
            onClick={() => onSelectType('video')}
            variant="outline"
            className="h-20 justify-start gap-4 text-left hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 hover-scale"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-lg">Video Call</div>
              <div className="text-sm text-muted-foreground">Face-to-face consultation with video</div>
            </div>
          </Button>
          
          <Button
            onClick={() => onSelectType('voice')}
            variant="outline"
            className="h-20 justify-start gap-4 text-left hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 hover-scale"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20">
              <Phone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-lg">Voice Call</div>
              <div className="text-sm text-muted-foreground">Audio-only consultation call</div>
            </div>
          </Button>
        </div>

        <Button
          onClick={onClose}
          variant="ghost"
          className="mt-6 hover:bg-slate-100"
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}