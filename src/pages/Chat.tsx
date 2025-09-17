import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Send, 
  MessageCircle, 
  Phone, 
  Video,
  ArrowLeft,
  Calendar,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Users
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { CallInterface } from '@/components/CallInterface';

interface Doctor {
  id: string;
  user_id: string;
  specialization: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  scheduled_time: string;
  consultation_fee?: number;
  doctor: {
    id: string;
    user_id: string;
    specialization: string;
    profiles: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
    };
  };
}

interface Message {
  id: string;
  appointment_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State for appointment checking
  const [checkingAppointment, setCheckingAppointment] = useState(true);
  const [appointmentStatus, setAppointmentStatus] = useState<'none' | 'pending' | 'approved'>('none');
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  
  // State for chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State for call
  const [activeCall, setActiveCall] = useState<{ type: 'voice' | 'video'; appointmentId: string } | null>(null);
  const [showCallOptions, setShowCallOptions] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check appointment status on mount
  useEffect(() => {
    if (user) {
      checkAppointmentAccess();
    }
  }, [user]);

  // Subscribe to messages when appointment is approved
  useEffect(() => {
    if (currentAppointment && appointmentStatus === 'approved') {
      fetchMessages();
      subscribeToMessages();
    }
  }, [currentAppointment, appointmentStatus]);

  const checkAppointmentAccess = async () => {
    if (!user?.id) return;
    
    setCheckingAppointment(true);
    
    try {
      // Get most recent appointment for this patient
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        setAppointmentStatus('none');
      } else {
        const appointment = appointments[0];
        
        // Get doctor details separately
        const { data: doctor } = await supabase
          .from('doctors')
          .select('id, user_id, specialization')
          .eq('user_id', appointment.doctor_id)
          .single();
          
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('user_id', appointment.doctor_id)
          .single();
        
        // Create formatted appointment
        const formattedAppointment: Appointment = {
          ...appointment,
          doctor: {
            id: doctor?.id || '',
            user_id: doctor?.user_id || appointment.doctor_id,
            specialization: doctor?.specialization || 'General Practice',
            profiles: profile || {
              first_name: 'Unknown',
              last_name: 'Doctor',
              avatar_url: undefined
            }
          }
        };
        
        setCurrentAppointment(formattedAppointment);
        
        if (appointment.status === 'approved') {
          setAppointmentStatus('approved');
        } else if (appointment.status === 'pending') {
          setAppointmentStatus('pending');
        } else {
          setAppointmentStatus('none');
        }
      }
    } catch (error) {
      console.error('Error checking appointment access:', error);
      toast({
        title: 'Error',
        description: 'Failed to check appointment status',
        variant: 'destructive'
      });
    } finally {
      setCheckingAppointment(false);
    }
  };

  const fetchMessages = async () => {
    if (!currentAppointment?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('appointment_id', currentAppointment.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = (data || []).map((msg) => ({
        ...msg,
        sender_name: msg.sender_id === user?.id ? 'You' : getDoctorName(),
        sender_avatar: msg.sender_id === user?.id ? user?.user_metadata?.avatar_url : currentAppointment?.doctor?.profiles?.avatar_url
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive'
      });
    }
  };

  const subscribeToMessages = () => {
    if (!currentAppointment?.id) return;

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `appointment_id=eq.${currentAppointment.id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          const formattedMessage = {
            ...newMessage,
            sender_name: newMessage.sender_id === user?.id ? 'You' : getDoctorName(),
            sender_avatar: newMessage.sender_id === user?.id ? user?.user_metadata?.avatar_url : currentAppointment?.doctor?.profiles?.avatar_url
          };
          
          setMessages(prev => [...prev, formattedMessage]);
          
          if (newMessage.sender_id !== user?.id) {
            toast({
              title: 'New Message',
              description: `Message from ${getDoctorName()}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentAppointment || !user) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          appointment_id: currentAppointment.id,
          sender_id: user.id,
          receiver_id: currentAppointment.doctor.user_id,
          message: newMessage.trim()
        });

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

  const handleStartCall = (type: 'voice' | 'video') => {
    if (!currentAppointment) return;
    
    setActiveCall({
      type,
      appointmentId: currentAppointment.id
    });
    setShowCallOptions(false);
  };

  const handleEndCall = () => {
    setActiveCall(null);
  };

  const getDoctorName = () => {
    if (!currentAppointment?.doctor?.profiles) return 'Doctor';
    const { first_name, last_name } = currentAppointment.doctor.profiles;
    return `Dr. ${first_name} ${last_name}`;
  };

  const proceedWithConsultation = () => {
    // For now, skip payment and proceed directly
    toast({
      title: 'Payment Skipped',
      description: 'Proceeding to consultation (payment integration coming soon)',
    });
    // In a real implementation, this would process payment first
  };

  // Show loading state
  if (checkingAppointment) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Checking appointment access...</p>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  // Show "no appointment" message
  if (appointmentStatus === 'none') {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <div className="flex items-center justify-center h-full p-6">
              <Card className="w-full max-w-md text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  </div>
                  <CardTitle>No Appointment Found</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    You must book an appointment first to chat with a doctor.
                  </p>
                  <div className="space-y-2">
                    <Button asChild className="w-full">
                      <div onClick={() => navigate('/book-appointment')}>
                        <Calendar className="w-4 h-4 mr-2" />
                        Book Appointment
                      </div>
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                      <div onClick={() => navigate('/user-dashboard')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  // Show "waiting for approval" message
  if (appointmentStatus === 'pending') {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <div className="flex items-center justify-center h-full p-6">
              <Card className="w-full max-w-md text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-yellow-600" />
                  </div>
                  <CardTitle>Waiting for Doctor Approval</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Your appointment is pending doctor approval. You'll be able to chat once it's approved.
                  </p>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm font-medium">Appointment Details:</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getDoctorName()} - {currentAppointment?.doctor?.specialization}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(currentAppointment?.scheduled_time || '').toLocaleString()}
                    </p>
                  </div>
                  <Button variant="outline" asChild className="w-full">
                    <div onClick={() => navigate('/user-dashboard')}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Dashboard
                    </div>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  // Show consultation fee prompt
  if (appointmentStatus === 'approved' && !messages.length) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <div className="flex items-center justify-center h-full p-6">
              <Card className="w-full max-w-md text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle>Consultation Ready</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Your appointment with {getDoctorName()} has been approved. 
                    Consultation fee required to proceed.
                  </p>
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Consultation Fee:</span>
                      <span className="text-lg font-bold">
                        ${currentAppointment?.consultation_fee || 50}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button onClick={proceedWithConsultation} className="w-full">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Proceed with Consultation
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                      <div onClick={() => navigate('/user-dashboard')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  // Show active call interface
  if (activeCall) {
    const callSession = {
      id: activeCall.appointmentId,
      type: activeCall.type,
      status: 'active'
    };
    
    return (
      <CallInterface
        callSession={callSession}
        onEndCall={handleEndCall}
        doctorName={getDoctorName()}
        doctorAvatar={currentAppointment?.doctor?.profiles?.avatar_url}
      />
    );
  }

  // Show main chat interface
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-border bg-background/95 backdrop-blur p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate('/user-dashboard')}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar>
                  <AvatarImage src={currentAppointment?.doctor?.profiles?.avatar_url} />
                  <AvatarFallback>
                    {currentAppointment?.doctor?.profiles?.first_name?.[0]}
                    {currentAppointment?.doctor?.profiles?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{getDoctorName()}</h2>
                  <p className="text-sm text-muted-foreground">
                    {currentAppointment?.doctor?.specialization}
                  </p>
                </div>
              </div>
              
              <Dialog open={showCallOptions} onOpenChange={setShowCallOptions}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Start Call</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 gap-3">
                    <Button onClick={() => handleStartCall('voice')} className="h-16">
                      <Phone className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Voice Call</div>
                        <div className="text-sm text-muted-foreground">Audio only</div>
                      </div>
                    </Button>
                    <Button onClick={() => handleStartCall('video')} variant="outline" className="h-16">
                      <Video className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Video Call</div>
                        <div className="text-sm text-muted-foreground">Audio and video</div>
                      </div>
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.sender_id !== user?.id && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={message.sender_avatar} />
                      <AvatarFallback>
                        {currentAppointment?.doctor?.profiles?.first_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_id === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{message.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {message.sender_id === user?.id && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback>{user?.user_metadata?.first_name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t border-border p-4">
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
              />
              <Button onClick={sendMessage} disabled={isLoading || !newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}