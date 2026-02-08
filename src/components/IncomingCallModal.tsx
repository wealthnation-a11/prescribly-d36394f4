import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video } from "lucide-react";

interface IncomingCallModalProps {
  callerName: string;
  callType: 'voice' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({ callerName, callType, onAccept, onReject }: IncomingCallModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-slate-800 rounded-2xl p-8 text-center max-w-sm mx-4 shadow-2xl border border-slate-600/50">
        <div className="relative mb-6">
          <Avatar className="w-24 h-24 mx-auto border-4 border-green-400/50 shadow-lg animate-pulse">
            <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/80 text-white">
              {callerName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>

        <h3 className="text-white text-xl font-bold mb-1">{callerName}</h3>
        <p className="text-slate-400 mb-8">
          Incoming {callType === 'video' ? 'video' : 'voice'} call...
        </p>

        <div className="flex justify-center gap-8">
          <Button
            onClick={onReject}
            className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700 shadow-lg"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </Button>
          <Button
            onClick={onAccept}
            className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700 shadow-lg"
          >
            {callType === 'video' ? <Video className="w-6 h-6 text-white" /> : <Phone className="w-6 h-6 text-white" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
