import { useState, useCallback } from 'react';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AgoraCallState {
  isConnected: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  remoteUsers: string[];
}

export const useAgoraCall = () => {
  const [client] = useState<IAgoraRTCClient>(() => AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }));
  const [callState, setCallState] = useState<AgoraCallState>({
    isConnected: false,
    isAudioEnabled: false,
    isVideoEnabled: false,
    remoteUsers: []
  });
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);

  const generateToken = async (appointmentId: string, userId: string, role: number = 1) => {
    try {
      const { data, error } = await supabase.functions.invoke('agora-token', {
        body: { appointmentId, userId, role }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating Agora token:', error);
      throw new Error('Failed to generate call token');
    }
  };

  const joinCall = useCallback(async (appointmentId: string, userId: string, audioOnly: boolean = false) => {
    try {
      // Generate token
      const tokenData = await generateToken(appointmentId, userId);
      
      if (!tokenData.token || !tokenData.channelName || !tokenData.appId) {
        throw new Error('Invalid token data received');
      }

      // Join the channel
      await client.join(tokenData.appId, tokenData.channelName, tokenData.token, userId);

      // Create and publish audio track
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      setLocalAudioTrack(audioTrack);
      await client.publish([audioTrack]);

      // Create and publish video track if not audio-only
      if (!audioOnly) {
        try {
          const videoTrack = await AgoraRTC.createCameraVideoTrack();
          setLocalVideoTrack(videoTrack);
          await client.publish([videoTrack]);
          setCallState(prev => ({ ...prev, isVideoEnabled: true }));
        } catch (videoError) {
          console.warn('Video not available, continuing with audio-only:', videoError);
          toast({
            title: 'Video Unavailable',
            description: 'Continuing with audio-only call',
            variant: 'default'
          });
        }
      }

      // Set up remote user events
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        setCallState(prev => ({
          ...prev,
          remoteUsers: [...new Set([...prev.remoteUsers, user.uid.toString()])]
        }));
      });

      client.on('user-unpublished', (user) => {
        setCallState(prev => ({
          ...prev,
          remoteUsers: prev.remoteUsers.filter(uid => uid !== user.uid.toString())
        }));
      });

      setCallState(prev => ({
        ...prev,
        isConnected: true,
        isAudioEnabled: true
      }));

      toast({
        title: 'Call Connected',
        description: 'You are now connected to the call',
      });

    } catch (error) {
      console.error('Error joining call:', error);
      toast({
        title: 'Call Error',
        description: 'Failed to join the call. Please try again.',
        variant: 'destructive'
      });
      throw error;
    }
  }, [client]);

  const leaveCall = useCallback(async () => {
    try {
      // Clean up local tracks
      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
        setLocalAudioTrack(null);
      }
      
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
        setLocalVideoTrack(null);
      }

      // Leave the channel
      await client.leave();

      setCallState({
        isConnected: false,
        isAudioEnabled: false,
        isVideoEnabled: false,
        remoteUsers: []
      });

      toast({
        title: 'Call Ended',
        description: 'You have left the call',
      });

    } catch (error) {
      console.error('Error leaving call:', error);
    }
  }, [client, localAudioTrack, localVideoTrack]);

  const toggleAudio = useCallback(async () => {
    if (localAudioTrack) {
      const newState = !callState.isAudioEnabled;
      await localAudioTrack.setEnabled(newState);
      setCallState(prev => ({ ...prev, isAudioEnabled: newState }));
    }
  }, [localAudioTrack, callState.isAudioEnabled]);

  const toggleVideo = useCallback(async () => {
    if (localVideoTrack) {
      const newState = !callState.isVideoEnabled;
      await localVideoTrack.setEnabled(newState);
      setCallState(prev => ({ ...prev, isVideoEnabled: newState }));
    }
  }, [localVideoTrack, callState.isVideoEnabled]);

  const getRemoteVideoTrack = useCallback((uid: string) => {
    const remoteUser = client.remoteUsers.find(user => user.uid.toString() === uid);
    return remoteUser?.videoTrack || null;
  }, [client.remoteUsers]);

  const getRemoteAudioTrack = useCallback((uid: string) => {
    const remoteUser = client.remoteUsers.find(user => user.uid.toString() === uid);
    return remoteUser?.audioTrack || null;
  }, [client.remoteUsers]);

  return {
    callState,
    localVideoTrack,
    joinCall,
    leaveCall,
    toggleAudio,
    toggleVideo,
    getRemoteVideoTrack,
    getRemoteAudioTrack
  };
};