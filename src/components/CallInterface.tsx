import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Minimize2, Users } from "lucide-react";
import { useCallSession } from "@/hooks/useCallSession";
import { toast } from "@/hooks/use-toast";

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

  // Add connection effect
  useEffect(() => {
    toast({
      title: "Call Connected",
      description: `${isVideoCall ? 'Video' : 'Voice'} call with ${doctorName} has started`,
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="bg-slate-800/70 backdrop-blur-sm p-4 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
          <span className="text-white font-medium text-lg">
            {isVideoCall ? 'Video Call' : 'Voice Call'}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-300 font-mono">
            {formatDuration(callDuration)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-slate-700/50 transition-all duration-200"
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
      <div className="bg-slate-800/70 backdrop-blur-sm p-6 border-t border-slate-700/50">
        <div className="flex items-center justify-center gap-6">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            className="rounded-full w-16 h-16 hover-scale transition-all duration-200 shadow-lg"
            onClick={() => {
              setIsMuted(!isMuted);
              toast({
                title: isMuted ? "Microphone On" : "Microphone Off",
                description: isMuted ? "You can now speak" : "You are now muted",
              });
            }}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          {isVideoCall && (
            <Button
              variant={isVideoEnabled ? "secondary" : "destructive"}
              size="lg"
              className="rounded-full w-16 h-16 hover-scale transition-all duration-200 shadow-lg"
              onClick={() => {
                setIsVideoEnabled(!isVideoEnabled);
                toast({
                  title: isVideoEnabled ? "Camera Off" : "Camera On",
                  description: isVideoEnabled ? "Your video is now off" : "Your video is now on",
                });
              }}
            >
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </Button>
          )}

          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16 hover-scale transition-all duration-200 shadow-lg bg-red-600 hover:bg-red-700"
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
    <div className="w-full h-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Doctor Video */}
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl overflow-hidden min-h-[350px] shadow-2xl border border-slate-600/50">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <Avatar className="w-24 h-24 mx-auto mb-6 border-4 border-white/20 shadow-lg">
              <AvatarImage src={doctorAvatar} />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/80 text-white">
                {doctorName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <p className="text-xl font-semibold mb-2">{doctorName}</p>
            <p className="text-sm text-slate-300 flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              Connected
            </p>
          </div>
        </div>
        <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-full border border-white/20">
          <span className="text-white text-sm font-medium">{doctorName}</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>

      {/* Patient Video */}
      <div className="relative bg-gradient-to-br from-slate-700 to-slate-600 rounded-2xl overflow-hidden min-h-[350px] shadow-2xl border border-slate-500/50">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            {isVideoEnabled ? (
              <div>
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-600 to-slate-500 rounded-full flex items-center justify-center border-4 border-white/20 shadow-lg">
                  <Video className="w-10 h-10 text-white" />
                </div>
                <p className="text-xl font-semibold mb-2">You</p>
                <p className="text-sm text-slate-300 flex items-center justify-center gap-2">
                  <Video className="w-4 h-4" />
                  Camera On
                </p>
              </div>
            ) : (
              <div>
                <div className="w-24 h-24 mx-auto mb-6 bg-slate-600/50 rounded-full flex items-center justify-center border-4 border-white/10">
                  <VideoOff className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-slate-400 text-lg">Camera Off</p>
              </div>
            )}
          </div>
        </div>
        <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-full border border-white/20">
          <span className="text-white text-sm font-medium">You</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>
    </div>
  );
}

function VoiceCallLayout({ doctorName, doctorAvatar, callDuration, formatDuration }: any) {
  return (
    <div className="text-center text-white max-w-lg mx-auto p-6">
      <div className="relative mb-8">
        <Avatar className="w-40 h-40 mx-auto border-8 border-white/20 shadow-2xl">
          <AvatarImage src={doctorAvatar} />
          <AvatarFallback className="text-5xl bg-gradient-to-br from-primary to-primary/80 text-white">
            {doctorName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center shadow-lg">
            <Phone className="w-3 h-3 text-green-900" />
          </div>
        </div>
      </div>
      
      <h2 className="text-3xl font-bold mb-3">{doctorName}</h2>
      <p className="text-slate-300 mb-8 text-lg">Voice Call</p>
      
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-slate-600/50 shadow-xl">
        <div className="text-5xl font-mono font-bold mb-4 text-green-400">
          {formatDuration(callDuration)}
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
          <span className="text-slate-300 font-medium">Connected</span>
        </div>
      </div>
    </div>
  );
}