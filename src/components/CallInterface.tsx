import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Minimize2 } from "lucide-react";
import { useCallSession } from "@/hooks/useCallSession";

interface CallInterfaceProps {
  callSession: any;
  onEndCall: () => void;
  doctorName?: string;
  doctorAvatar?: string;
}

export function CallInterface({ callSession, onEndCall, doctorName = "Doctor", doctorAvatar }: CallInterfaceProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callSession.type === 'video');
  const { callDuration, formatDuration } = useCallSession();

  const isVideoCall = callSession.type === 'video';

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800/50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white font-medium">
            {isVideoCall ? 'Video Call' : 'Voice Call'} - {formatDuration(callDuration)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-slate-700"
          onClick={onEndCall}
        >
          <Minimize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Call Area */}
      <div className="flex-1 flex items-center justify-center p-6">
        {isVideoCall ? (
          <VideoCallLayout 
            doctorName={doctorName} 
            doctorAvatar={doctorAvatar}
            isVideoEnabled={isVideoEnabled}
          />
        ) : (
          <VoiceCallLayout 
            doctorName={doctorName} 
            doctorAvatar={doctorAvatar}
            callDuration={callDuration}
            formatDuration={formatDuration}
          />
        )}
      </div>

      {/* Controls */}
      <div className="bg-slate-800/50 p-6">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          {isVideoCall && (
            <Button
              variant={isVideoEnabled ? "secondary" : "destructive"}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={() => setIsVideoEnabled(!isVideoEnabled)}
            >
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </Button>
          )}

          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={onEndCall}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function VideoCallLayout({ doctorName, doctorAvatar, isVideoEnabled }: any) {
  return (
    <div className="w-full h-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Doctor Video */}
      <div className="relative bg-slate-800 rounded-lg overflow-hidden min-h-[300px]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <Avatar className="w-20 h-20 mx-auto mb-4">
              <AvatarImage src={doctorAvatar} />
              <AvatarFallback className="text-2xl">{doctorName.charAt(0)}</AvatarFallback>
            </Avatar>
            <p className="text-lg font-medium">{doctorName}</p>
            <p className="text-sm text-slate-400">Doctor Video</p>
          </div>
        </div>
        <div className="absolute top-4 left-4 bg-slate-900/80 px-3 py-1 rounded-full">
          <span className="text-white text-sm font-medium">{doctorName}</span>
        </div>
      </div>

      {/* Patient Video */}
      <div className="relative bg-slate-700 rounded-lg overflow-hidden min-h-[300px]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            {isVideoEnabled ? (
              <div>
                <div className="w-20 h-20 mx-auto mb-4 bg-slate-600 rounded-full flex items-center justify-center">
                  <Video className="w-8 h-8" />
                </div>
                <p className="text-lg font-medium">You</p>
                <p className="text-sm text-slate-400">Your Video</p>
              </div>
            ) : (
              <div>
                <VideoOff className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-slate-400">Video Off</p>
              </div>
            )}
          </div>
        </div>
        <div className="absolute top-4 left-4 bg-slate-900/80 px-3 py-1 rounded-full">
          <span className="text-white text-sm font-medium">You</span>
        </div>
      </div>
    </div>
  );
}

function VoiceCallLayout({ doctorName, doctorAvatar, callDuration, formatDuration }: any) {
  return (
    <div className="text-center text-white max-w-md mx-auto">
      <Avatar className="w-32 h-32 mx-auto mb-6">
        <AvatarImage src={doctorAvatar} />
        <AvatarFallback className="text-4xl">{doctorName.charAt(0)}</AvatarFallback>
      </Avatar>
      
      <h2 className="text-2xl font-bold mb-2">{doctorName}</h2>
      <p className="text-slate-400 mb-6">Voice Call</p>
      
      <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
        <div className="text-3xl font-mono font-bold mb-2">
          {formatDuration(callDuration)}
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-slate-400">Connected</span>
        </div>
      </div>
    </div>
  );
}