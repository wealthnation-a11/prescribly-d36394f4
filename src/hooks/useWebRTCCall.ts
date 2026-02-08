import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export interface WebRTCCallState {
  isConnected: boolean;
  isConnecting: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isIncomingCall: boolean;
  callType: 'voice' | 'video' | null;
  remoteUserId: string | null;
  channelName: string | null;
}

interface IncomingCallData {
  callerId: string;
  callerName: string;
  callType: 'voice' | 'video';
  appointmentId: string;
}

export const useWebRTCCall = () => {
  const { user } = useAuth();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const hasRemoteDesc = useRef(false);

  const [callState, setCallState] = useState<WebRTCCallState>({
    isConnected: false,
    isConnecting: false,
    isAudioEnabled: true,
    isVideoEnabled: false,
    isIncomingCall: false,
    callType: null,
    remoteUserId: null,
    channelName: null,
  });

  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream>(new MediaStream());

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    hasRemoteDesc.current = false;
    iceCandidateQueue.current = [];
    remoteStreamRef.current = new MediaStream();
    setLocalStream(null);
    setRemoteStream(new MediaStream());
    setIncomingCall(null);
    setCallState({
      isConnected: false,
      isConnecting: false,
      isAudioEnabled: true,
      isVideoEnabled: false,
      isIncomingCall: false,
      callType: null,
      remoteUserId: null,
      channelName: null,
    });
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate.toJSON(), senderId: user?.id },
        });
      }
    };

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach(track => {
        remoteStreamRef.current.addTrack(track);
      });
      setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
    };

    pc.onconnectionstatechange = () => {
      console.log('WebRTC connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        toast({ title: 'Call Disconnected', description: 'The connection was lost.', variant: 'destructive' });
        cleanup();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [user?.id, cleanup]);

  const getMediaStream = useCallback(async (videoEnabled: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: videoEnabled,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn('Media access error, trying audio only:', err);
      if (videoEnabled) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        setLocalStream(stream);
        toast({ title: 'Camera Unavailable', description: 'Continuing with audio only.' });
        return stream;
      }
      throw err;
    }
  }, []);

  const processIceQueue = useCallback(async () => {
    if (!pcRef.current || !hasRemoteDesc.current) return;
    for (const candidate of iceCandidateQueue.current) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('Failed to add queued ICE candidate:', e);
      }
    }
    iceCandidateQueue.current = [];
  }, []);

  const setupSignalingChannel = useCallback((appointmentId: string, isInitiator: boolean) => {
    const channelName = `call:${appointmentId}`;
    const channel = supabase.channel(channelName);

    channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
      if (!pcRef.current || payload.senderId === user?.id) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        hasRemoteDesc.current = true;
        await processIceQueue();
      } catch (e) {
        console.error('Error setting remote description (answer):', e);
      }
    });

    channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
      if (payload.senderId === user?.id) return;
      if (!isInitiator && !pcRef.current) {
        // Incoming call - show notification
        setIncomingCall({
          callerId: payload.senderId,
          callerName: payload.callerName || 'Unknown',
          callType: payload.callType || 'voice',
          appointmentId,
        });
        setCallState(prev => ({ ...prev, isIncomingCall: true }));
      }
    });

    channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
      if (payload.senderId === user?.id) return;
      if (!pcRef.current || !hasRemoteDesc.current) {
        iceCandidateQueue.current.push(payload.candidate);
        return;
      }
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (e) {
        console.warn('Failed to add ICE candidate:', e);
      }
    });

    channel.on('broadcast', { event: 'call-ended' }, ({ payload }) => {
      if (payload.senderId === user?.id) return;
      toast({ title: 'Call Ended', description: 'The other party ended the call.' });
      cleanup();
    });

    channel.subscribe();
    channelRef.current = channel;
    return channel;
  }, [user?.id, cleanup, processIceQueue]);

  // Start a call (initiator)
  const startCall = useCallback(async (appointmentId: string, remoteUserId: string, callType: 'voice' | 'video', callerName: string) => {
    try {
      setCallState(prev => ({
        ...prev,
        isConnecting: true,
        callType,
        remoteUserId,
        channelName: `call:${appointmentId}`,
      }));

      const isVideo = callType === 'video';
      const stream = await getMediaStream(isVideo);
      const pc = createPeerConnection();

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const channel = setupSignalingChannel(appointmentId, true);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer via broadcast
      channel.send({
        type: 'broadcast',
        event: 'offer',
        payload: {
          sdp: pc.localDescription,
          senderId: user?.id,
          callerName,
          callType,
        },
      });

      setCallState(prev => ({
        ...prev,
        isVideoEnabled: isVideo && stream.getVideoTracks().length > 0,
        isAudioEnabled: true,
      }));

    } catch (error) {
      console.error('Error starting call:', error);
      toast({ title: 'Call Failed', description: 'Could not start the call. Check microphone permissions.', variant: 'destructive' });
      cleanup();
      throw error;
    }
  }, [user?.id, getMediaStream, createPeerConnection, setupSignalingChannel, cleanup]);

  // Accept an incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      setCallState(prev => ({ ...prev, isConnecting: true, isIncomingCall: false }));

      const isVideo = incomingCall.callType === 'video';
      const stream = await getMediaStream(isVideo);
      const pc = createPeerConnection();

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Re-setup channel to listen for the actual offer details
      const channel = channelRef.current || setupSignalingChannel(incomingCall.appointmentId, false);

      // Listen for the actual offer (it may have already arrived, so also handle new ones)
      channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.senderId === user?.id || !pcRef.current) return;
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          hasRemoteDesc.current = true;
          
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);

          channel.send({
            type: 'broadcast',
            event: 'answer',
            payload: { sdp: pcRef.current.localDescription, senderId: user?.id },
          });

          await processIceQueue();
        } catch (e) {
          console.error('Error handling offer during accept:', e);
        }
      });

      // Request the caller to resend their offer
      channel.send({
        type: 'broadcast',
        event: 'ready-to-receive',
        payload: { senderId: user?.id },
      });

      setCallState(prev => ({
        ...prev,
        callType: incomingCall.callType,
        remoteUserId: incomingCall.callerId,
        channelName: `call:${incomingCall.appointmentId}`,
        isVideoEnabled: isVideo && stream.getVideoTracks().length > 0,
        isAudioEnabled: true,
      }));

      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      toast({ title: 'Error', description: 'Failed to accept the call.', variant: 'destructive' });
      cleanup();
    }
  }, [incomingCall, user?.id, getMediaStream, createPeerConnection, setupSignalingChannel, processIceQueue, cleanup]);

  const rejectCall = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: { senderId: user?.id },
      });
    }
    cleanup();
  }, [user?.id, cleanup]);

  const endCall = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: { senderId: user?.id },
      });
    }
    cleanup();
    toast({ title: 'Call Ended', description: 'You have left the call.' });
  }, [user?.id, cleanup]);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isAudioEnabled: audioTrack.enabled }));
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState(prev => ({ ...prev, isVideoEnabled: videoTrack.enabled }));
      }
    }
  }, []);

  // Listen for incoming calls on a specific appointment channel
  const listenForCalls = useCallback((appointmentId: string) => {
    if (channelRef.current) return; // Already listening
    setupSignalingChannel(appointmentId, false);
  }, [setupSignalingChannel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    callState,
    incomingCall,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
    listenForCalls,
    cleanup,
  };
};
