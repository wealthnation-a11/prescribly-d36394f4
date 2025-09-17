import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedActivityLogger } from '@/hooks/useEnhancedActivityLogger';
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
  Search, 
  MessageCircle, 
  Phone, 
  Video,
  MoreVertical,
  Clock,
  Wifi,
  Paperclip,
  Mic,
  MicOff,
  Play,
  Pause,
  ArrowLeft,
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useEncryption } from '@/hooks/useEncryption';

interface Doctor {
  id: string;
  user_id: string;
  specialization: string;
  bio?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  online_status?: boolean;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message?: string | null;
  encrypted_message?: string | null;
  encryption_version?: number | null;
  key_exchange_data?: any | null;
  file_url?: string | null;
  file_type?: 'image' | 'pdf' | 'docx' | 'audio' | null;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

interface Conversation {
  id: string;
  doctor: Doctor;
  last_message?: ChatMessage;
  unread_count?: number;
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { logMessageSent } = useEnhancedActivityLogger();
  const { 
    isInitialized, 
    encryptMessage, 
    decryptMessage, 
    isEncrypted, 
    fetchMultiplePublicKeys 
  } = useEncryption();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if user has appointments with doctors before allowing chat
  const checkAppointmentAccess = async (doctorId: string) => {
    if (!user?.id) return false;
    
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('patient_id', user.id)
      .eq('doctor_id', doctorId)
      .in('status', ['approved', 'completed']);
    
    if (error) {
      console.error('Error checking appointment access:', error);
      return false;
    }
    
    return (appointments && appointments.length > 0);
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Subscribe to appointment changes for real-time updates
      const appointmentsChannel = supabase
        .channel('patient-appointment-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
            filter: `patient_id=eq.${user.id}`
          },
          () => {
            // Refetch conversations when appointments change
            fetchConversations();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(appointmentsChannel);
      };
    }
  }, [user]);

  useEffect(() => {
    if (selectedDoctor && user) {
      fetchMessages(selectedDoctor.user_id);
      subscribeToMessages();
    }
  }, [selectedDoctor, user]);

  const fetchConversations = async () => {
    try {
      if (!user?.id) return;
      
      // Get doctors with approved appointments for this patient
      const { data: approvedAppointments, error: apptError } = await supabase
        .from('appointments')
        .select('doctor_id')
        .eq('patient_id', user.id)
        .eq('status', 'approved');

      if (apptError) throw apptError;

      const doctorIds = approvedAppointments?.map(apt => apt.doctor_id) || [];
      
      if (doctorIds.length === 0) {
        setConversations([]);
        return;
      }

      const { data: doctors, error } = await supabase
        .from('public_doctor_profiles')
        .select('doctor_id, doctor_user_id, specialization, bio, first_name, last_name, avatar_url')
        .in('doctor_user_id', doctorIds);

      if (error) throw error;

      const formattedConversations: Conversation[] = (doctors || []).map((doctor: any) => ({
        id: `${user?.id}-${doctor.doctor_user_id}`,
        doctor: {
          id: doctor.doctor_id,
          user_id: doctor.doctor_user_id,
          specialization: doctor.specialization,
          bio: doctor.bio,
          first_name: doctor.first_name,
          last_name: doctor.last_name,
          avatar_url: doctor.avatar_url,
          online_status: Math.random() > 0.5 // Mock online status
        }
      })) || [];

      setConversations(formattedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load approved doctors',
        variant: 'destructive'
      });
    }
  };

  const fetchMessages = async (doctorId: string) => {
    try {
      // Temporarily using any to bypass TypeScript until types regenerate
      const { data, error } = await (supabase as any)
        .from('chats')
        .select('*')
        .or(`and(sender_id.eq.${user?.id},recipient_id.eq.${doctorId}),and(sender_id.eq.${doctorId},recipient_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: ChatMessage[] = await Promise.all(
        (data || []).map(async (msg) => {
          let displayMessage = msg.message;
          
          // Try to decrypt if message is encrypted
          if (msg.encrypted_message && isEncrypted(msg.encrypted_message)) {
            try {
              displayMessage = await decryptMessage(msg.encrypted_message);
            } catch (error) {
              console.error('Failed to decrypt message:', error);
              displayMessage = '[Encrypted message]';
            }
          }

          return {
            ...msg,
            message: displayMessage,
            file_type: msg.file_type as 'image' | 'pdf' | 'docx' | 'audio' | null,
            sender_name: msg.sender_id === user?.id ? 'You' : selectedDoctor?.first_name || 'Doctor',
            sender_avatar: msg.sender_id === user?.id ? user?.user_metadata?.avatar_url : selectedDoctor?.avatar_url
          };
        })
      );

      setMessages(formattedMessages);
      
      // Fetch public keys for all participants for future messages
      const participantIds = Array.from(new Set([doctorId, user?.id].filter(Boolean))) as string[];
      await fetchMultiplePublicKeys(participantIds);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!selectedDoctor || !user) return;

    const channel = supabase
      .channel('chat-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: `or(and(sender_id.eq.${user.id},recipient_id.eq.${selectedDoctor.user_id}),and(sender_id.eq.${selectedDoctor.user_id},recipient_id.eq.${user.id}))`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Decrypt incoming message if needed
          const handleIncomingMessage = async () => {
            let displayMessage = newMessage.message;
            
            if (newMessage.encrypted_message && isEncrypted(newMessage.encrypted_message)) {
              try {
                displayMessage = await decryptMessage(newMessage.encrypted_message);
              } catch (error) {
                console.error('Failed to decrypt incoming message:', error);
                displayMessage = '[Encrypted message]';
              }
            }

            const processedMessage = {
              ...newMessage,
              message: displayMessage,
              sender_name: newMessage.sender_id === user.id ? 'You' : selectedDoctor?.first_name || 'Doctor',
              sender_avatar: newMessage.sender_id === user.id ? user?.user_metadata?.avatar_url : selectedDoctor?.avatar_url
            };

            setMessages(prev => [...prev, processedMessage]);
            
            if (newMessage.sender_id !== user.id) {
              toast({
                title: 'New Message',
                description: `Message from Dr. ${selectedDoctor?.first_name}`,
              });
            }
          };

          handleIncomingMessage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (messageContent?: string, fileUrl?: string, fileType?: string) => {
    if ((!newMessage.trim() && !messageContent && !fileUrl) || !selectedDoctor || !user) return;

    setIsLoading(true);
    setIsTyping(true);

    try {
      const messageText = messageContent || newMessage.trim();
      let encryptedMessage = null;
      let plainMessage = null;

      // Try to encrypt the message if encryption is available
      if (messageText && isInitialized) {
        try {
          encryptedMessage = await encryptMessage(messageText, selectedDoctor.user_id);
          if (!encryptedMessage) {
            // Fallback to plaintext if encryption fails
            plainMessage = messageText;
          }
        } catch (error) {
          console.warn('Encryption failed, sending as plaintext:', error);
          plainMessage = messageText;
        }
      } else {
        plainMessage = messageText;
      }

      const { error } = await supabase
        .from('chats')
        .insert({
          sender_id: user.id,
          recipient_id: selectedDoctor.user_id,
          message: plainMessage || undefined,
          encrypted_message: encryptedMessage || undefined,
          file_url: fileUrl,
          file_type: fileType as any,
          encryption_version: encryptedMessage ? 1 : undefined
        });

      if (error) throw error;

      // Log the message activity
      if (selectedDoctor) {
        logMessageSent(
          `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`,
          true
        );
      }

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
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedDoctor || !user) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload only images, PDFs, or Word documents.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      let fileType: string;
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type === 'application/pdf') fileType = 'pdf';
      else if (file.type.includes('wordprocessing')) fileType = 'docx';
      else fileType = 'image';

      await sendMessage(`Shared a ${fileType}`, publicUrl, fileType);
      
      // Log file sharing activity
      if (selectedDoctor) {
        logMessageSent(
          `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`,
          true
        );
      }
      
      toast({
        title: 'File Uploaded',
        description: 'File has been shared successfully.',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      setMediaRecorder(recorder);
      setAudioChunks([]);
      setIsRecording(true);

      recorder.ondataavailable = (event) => {
        setAudioChunks(prev => [...prev, event.data]);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const fileName = `${user?.id}/${Date.now()}_voice_note.wav`;

        try {
          const { data, error } = await supabase.storage
            .from('chat-files')
            .upload(fileName, audioBlob);

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('chat-files')
            .getPublicUrl(fileName);

          await sendMessage('Sent a voice note', publicUrl, 'audio');
          
          // Log voice message activity
          if (selectedDoctor) {
            logMessageSent(
              `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`,
              true
            );
          }
          
          toast({
            title: 'Voice Note Sent',
            description: 'Your voice note has been shared.',
          });
        } catch (error) {
          console.error('Error uploading voice note:', error);
          toast({
            title: 'Upload Error',
            description: 'Failed to upload voice note.',
            variant: 'destructive'
          });
        }

        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Recording Error',
        description: 'Could not access microphone.',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const playAudio = (audioUrl: string) => {
    if (playingAudio === audioUrl) {
      setPlayingAudio(null);
      return;
    }
    
    const audio = new Audio(audioUrl);
    setPlayingAudio(audioUrl);
    
    audio.onended = () => setPlayingAudio(null);
    audio.play();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    `${conv.doctor.first_name} ${conv.doctor.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: ChatMessage) => {
    const isOwn = message.sender_id === user?.id;
    
    return (
      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[70%] rounded-lg p-3 ${
          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}>
          {message.file_url ? (
            <div className="space-y-2">
              {message.file_type === 'image' && (
                <img 
                  src={message.file_url} 
                  alt="Shared image" 
                  className="max-w-full h-auto rounded"
                />
              )}
              {message.file_type === 'audio' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => playAudio(message.file_url!)}
                  >
                    {playingAudio === message.file_url ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <span className="text-sm">Voice Note</span>
                </div>
              )}
              {(message.file_type === 'pdf' || message.file_type === 'docx') && (
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  <a 
                    href={message.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm underline"
                  >
                    Download {message.file_type.toUpperCase()}
                  </a>
                </div>
              )}
              {message.message && (
                <p className="body-medium">{message.message}</p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="body-medium">{message.message}</p>
              {isInitialized && (
                <div className="flex items-center gap-1 opacity-60">
                  <div className={`w-2 h-2 rounded-full ${
                    message.encrypted_message ? 'bg-green-400' : 'bg-yellow-400'
                  }`} />
                  <span className="text-xs">
                    {message.encrypted_message ? 'Encrypted' : 'Unencrypted'}
                  </span>
                </div>
              )}
            </div>
          )}
          <p className={`body-small mt-1 ${
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}>
            {formatTime(message.created_at)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <div className="flex h-full">
            {/* Conversations Sidebar */}
            <div className="w-80 border-r border-border bg-card flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/book-appointment')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Appointments
                  </Button>
                </div>
                <h2 className="heading-lg mb-4">Chat with Doctors</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search doctors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="body-medium">No approved doctors available</p>
                      <p className="body-small">Chat becomes available after doctor approval</p>
                    </div>
                  ) : (
                    filteredConversations.map((conversation) => (
                      <Card
                        key={conversation.id}
                        className={`mb-2 cursor-pointer transition-all hover:bg-accent/50 ${
                          selectedDoctor?.id === conversation.doctor.id ? 'bg-primary/10 border-primary' : ''
                        }`}
                        onClick={() => setSelectedDoctor(conversation.doctor)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="w-12 h-12">
                                <AvatarImage src={conversation.doctor.avatar_url} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {conversation.doctor.first_name?.[0]}{conversation.doctor.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              {conversation.doctor.online_status && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="body-medium font-semibold">
                                Dr. {conversation.doctor.first_name} {conversation.doctor.last_name}
                              </p>
                              <p className="body-small text-muted-foreground truncate">
                                {conversation.doctor.specialization}
                              </p>
                              {conversation.doctor.online_status ? (
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                  <Wifi className="w-3 h-3 mr-1" />
                                  Online
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Offline
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedDoctor ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-border bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={selectedDoctor.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {selectedDoctor.first_name?.[0]}{selectedDoctor.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="body-medium font-semibold">
                            Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}
                          </h3>
                          <p className="body-small text-muted-foreground">
                            {selectedDoctor.specialization}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Video className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="body-medium">Start a conversation</p>
                          <p className="body-small">Send a message to begin chatting with the doctor</p>
                        </div>
                      ) : (
                        messages.map(renderMessage)
                      )}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg p-3 max-w-[70%]">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t border-border bg-card space-y-3">
                    {/* Schedule Call Button */}
                    <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule a Call
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Schedule a Call</DialogTitle>
                        </DialogHeader>
                        <div className="text-center py-8">
                          <Phone className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                          <h3 className="text-lg font-semibold mb-2">Coming Soon!</h3>
                          <p className="text-muted-foreground">
                            Video and voice calling features will be available soon. 
                            Stay tuned for updates!
                          </p>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*,application/pdf,.docx"
                        className="hidden"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`px-3 ${isRecording ? 'text-red-500' : ''}`}
                      >
                        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                      <Button
                        onClick={() => sendMessage()}
                        disabled={!newMessage.trim() || isLoading}
                        size="sm"
                        className="px-3"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-muted/20">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="heading-md mb-2">Select a doctor to start chatting</h3>
                    <p className="body-medium text-muted-foreground">
                      Choose a doctor from the sidebar to begin your conversation
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}