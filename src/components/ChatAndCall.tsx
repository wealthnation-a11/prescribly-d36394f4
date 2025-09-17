import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAgoraCall } from '@/hooks/useAgoraCall';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Phone, 
  Video,
  Calendar,
  AlertCircle,
  Users,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff as VideoOffIcon
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  appointment_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  scheduled_time: string;
}

type Status = 'loading' | 'not-booked' | 'pending' | 'approved' | 'in-call';

export default function ChatAndCall() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [doctorName, setDoctorName] = useState<string>('Doctor');
  const [doctorAvatar, setDoctorAvatar] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { 
    callState, 
    localVideoTrack, 
    joinCall, 
    leaveCall, 
    toggleAudio, 
    toggleVideo,
    getRemoteVideoTrack 
  } = useAgoraCall();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check appointment status
  useEffect(() => {
    if (!user?.id) return;
    
    const checkBookingStatus = async () => {
      try {
        // Get most recent appointment
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (!appointments || appointments.length === 0) {
          setStatus('not-booked');
          return;
        }

        const latestAppointment = appointments[0];
        setAppointment(latestAppointment);

        // Get doctor details
        const { data: doctorProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('user_id', latestAppointment.doctor_id)
          .single();

        if (doctorProfile) {
          setDoctorName(`Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}`);
          setDoctorAvatar(doctorProfile.avatar_url);
        }

        // Set status based on appointment
        if (latestAppointment.status === 'pending') {
          setStatus('pending');
        } else if (latestAppointment.status === 'approved') {
          setStatus('approved');
        } else {
          setStatus('not-booked');
        }
      } catch (error) {
        console.error('Error checking appointment status:', error);
        setStatus('not-booked');
      }
    };

    checkBookingStatus();
  }, [user?.id]);

  // Load messages when appointment is approved
  useEffect(() => {
    if (!appointment?.id || status !== 'approved') return;

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('appointment_id', appointment.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();

    // Subscribe to real-time messages
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `appointment_id=eq.${appointment.id}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          
          if (payload.new.sender_id !== user?.id) {
            toast({
              title: 'New Message',
              description: `Message from ${doctorName}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appointment?.id, status, user?.id, doctorName]);

  // Handle video rendering
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current && status === 'in-call') {
      localVideoTrack.play(localVideoRef.current);
    }
  }, [localVideoTrack, status]);

  useEffect(() => {
    if (callState.remoteUsers.length > 0 && remoteVideoRef.current && status === 'in-call') {
      const remoteVideoTrack = getRemoteVideoTrack(callState.remoteUsers[0]);
      if (remoteVideoTrack) {
        remoteVideoTrack.play(remoteVideoRef.current);
      }
    }
  }, [callState.remoteUsers, getRemoteVideoTrack, status]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !appointment?.id || !user?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from('messages').insert([{
        appointment_id: appointment.id,
        sender_id: user.id,
        content: newMessage.trim(),
      }]);

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Start call
  const startCall = async (audioOnly: boolean = false) => {
    if (!appointment?.id || !user?.id) return;

    try {
      setStatus('in-call');
      const channelName = `appointment_${appointment.doctor_id}_${user.id}`;
      await joinCall(appointment.id, user.id, audioOnly);
      
      toast({
        title: 'Call Started',
        description: `${audioOnly ? 'Voice' : 'Video'} call with ${doctorName}`,
      });
    } catch (error) {
      console.error('Error starting call:', error);
      setStatus('approved');
      toast({
        title: 'Call Failed',
        description: 'Unable to start call. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // End call
  const endCall = async () => {
    try {
      await leaveCall();
      setStatus('approved');
      toast({
        title: 'Call Ended',
        description: 'Call has been ended',
      });
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  // Render different states
  if (status === 'loading') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mr-3"></div>
            <span>Checking your appointment status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'not-booked') {
    return (
      <Card className="w-full max-w-md mx-auto text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle>No Appointment Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            You need to book an appointment to chat with a doctor.
          </p>
          <Button onClick={() => navigate('/book-appointment')} className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            Book an Appointment
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === 'pending') {
    return (
      <Card className="w-full max-w-md mx-auto text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-yellow-600" />
          </div>
          <CardTitle>Awaiting Doctor Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Your appointment request is awaiting doctor approval.
          </p>
          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-medium">Appointment with {doctorName}</p>
            <p className="text-muted-foreground">
              {appointment?.scheduled_time ? new Date(appointment.scheduled_time).toLocaleString() : 'Scheduling...'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'in-call') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-800 z-50 flex flex-col">
        {/* Call Header */}
        <div className="bg-slate-800/70 backdrop-blur-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={doctorAvatar || undefined} />
              <AvatarFallback>{doctorName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-white">
              <h3 className="font-semibold">{doctorName}</h3>
              <p className="text-sm text-slate-300">
                {callState.remoteUsers.length > 0 ? 'Connected' : 'Connecting...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white text-sm">In Call</span>
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative">
          {/* Remote Video */}
          <div ref={remoteVideoRef} className="w-full h-full bg-slate-700">
            {callState.remoteUsers.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white">
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarImage src={doctorAvatar || undefined} />
                    <AvatarFallback className="text-2xl">{doctorName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="text-lg">Waiting for {doctorName}...</p>
                </div>
              </div>
            )}
          </div>

          {/* Local Video (PiP) */}
          {localVideoTrack && (
            <div 
              ref={localVideoRef}
              className="absolute bottom-4 right-4 w-48 h-36 bg-slate-600 rounded-lg border-2 border-white/20 overflow-hidden"
            />
          )}
        </div>

        {/* Call Controls */}
        <div className="bg-slate-800/70 backdrop-blur-sm p-6">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={callState.isAudioEnabled ? "secondary" : "destructive"}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={toggleAudio}
            >
              {callState.isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </Button>

            <Button
              variant={callState.isVideoEnabled ? "secondary" : "destructive"}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={toggleVideo}
            >
              {callState.isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOffIcon className="w-6 h-6" />}
            </Button>

            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={endCall}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main Chat + Call Interface
  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={doctorAvatar || undefined} />
                <AvatarFallback>{doctorName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{doctorName}</CardTitle>
                <p className="text-sm text-muted-foreground">Available for consultation</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => startCall(true)}>
                <Phone className="w-4 h-4 mr-2" />
                Voice Call
              </Button>
              <Button variant="outline" size="sm" onClick={() => startCall(false)}>
                <Video className="w-4 h-4 mr-2" />
                Video Call
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Messages */}
          <ScrollArea className="h-96 w-full border rounded-lg p-4 mb-4 bg-gray-50">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      msg.sender_id === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white border'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={isLoading || !newMessage.trim()}
              className="bg-green-500 hover:bg-green-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}