import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Minimize2 } from "lucide-react";

interface CallInterfaceProps {
  callType: 'voice' | 'video';
  localStream: MediaStream | null;
  remoteStream: MediaStream;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isConnected: boolean;
  onEndCall: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  remoteName?: string;
  remoteAvatar?: string;
}

export function CallInterface({
  callType,
  localStream,
  remoteStream,
  isAudioEnabled,
  isVideoEnabled,
  isConnected,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
  remoteName = "User",
  remoteAvatar,
}: CallInterfaceProps) {
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const hasRemoteVideo = remoteStream.getVideoTracks().length > 0 && remoteStream.getVideoTracks()[0]?.enabled;
  const isVideoCall = callType === 'video';

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="bg-slate-800/70 backdrop-blur-sm p-4 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 'bg-yellow-400 animate-pulse'}`} />
          <span className="text-white font-medium text-lg">
            {isVideoCall ? 'Video Call' : 'Voice Call'}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-300 font-mono">{formatDuration(duration)}</span>
          {!isConnected && <span className="text-yellow-300 text-sm ml-2">Connecting...</span>}
        </div>
        <Button variant="ghost" size="sm" className="text-white hover:bg-slate-700/50" onClick={onEndCall}>
          <Minimize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Call Area */}
      <div className="flex-1 flex items-center justify-center p-6">
        {isVideoCall ? (
          <div className="w-full h-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Remote Video */}
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl overflow-hidden min-h-[350px] shadow-2xl border border-slate-600/50">
              {hasRemoteVideo ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Avatar className="w-24 h-24 mx-auto mb-6 border-4 border-white/20 shadow-lg">
                      <AvatarImage src={remoteAvatar} />
                      <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/80 text-white">
                        {remoteName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-xl font-semibold">{remoteName}</p>
                    <p className="text-sm text-slate-300 mt-2">{isConnected ? 'Connected' : 'Connecting...'}</p>
                  </div>
                </div>
              )}
              <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-full border border-white/20">
                <span className="text-white text-sm font-medium">{remoteName}</span>
              </div>
            </div>

            {/* Local Video */}
            <div className="relative bg-gradient-to-br from-slate-700 to-slate-600 rounded-2xl overflow-hidden min-h-[350px] shadow-2xl border border-slate-500/50">
              {isVideoEnabled && localStream?.getVideoTracks().length ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" style={{ transform: 'scaleX(-1)' }} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-24 h-24 mx-auto mb-6 bg-slate-600/50 rounded-full flex items-center justify-center border-4 border-white/10">
                      <VideoOff className="w-10 h-10 text-slate-400" />
                    </div>
                    <p className="text-slate-400 text-lg">Camera Off</p>
                  </div>
                </div>
              )}
              <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-full border border-white/20">
                <span className="text-white text-sm font-medium">You</span>
              </div>
            </div>
          </div>
        ) : (
          /* Voice Call Layout */
          <div className="text-center text-white max-w-lg mx-auto p-6">
            <div className="relative mb-8">
              <Avatar className="w-40 h-40 mx-auto border-8 border-white/20 shadow-2xl">
                <AvatarImage src={remoteAvatar} />
                <AvatarFallback className="text-5xl bg-gradient-to-br from-primary to-primary/80 text-white">
                  {remoteName.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
            <h2 className="text-3xl font-bold mb-3">{remoteName}</h2>
            <p className="text-slate-300 mb-8 text-lg">Voice Call</p>
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-slate-600/50 shadow-xl">
              <div className="text-5xl font-mono font-bold mb-4 text-green-400">{formatDuration(duration)}</div>
              <div className="flex items-center justify-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 'bg-yellow-400 animate-pulse'}`} />
                <span className="text-slate-300 font-medium">{isConnected ? 'Connected' : 'Connecting...'}</span>
              </div>
            </div>
            {/* Hidden audio element for remote audio */}
            <audio ref={remoteVideoRef as any} autoPlay />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-slate-800/70 backdrop-blur-sm p-6 border-t border-slate-700/50">
        <div className="flex items-center justify-center gap-6">
          <Button
            variant={isAudioEnabled ? "secondary" : "destructive"}
            size="lg"
            className="rounded-full w-16 h-16 shadow-lg"
            onClick={onToggleAudio}
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>

          {isVideoCall && (
            <Button
              variant={isVideoEnabled ? "secondary" : "destructive"}
              size="lg"
              className="rounded-full w-16 h-16 shadow-lg"
              onClick={onToggleVideo}
            >
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </Button>
          )}

          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16 shadow-lg bg-red-600 hover:bg-red-700"
            onClick={onEndCall}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
