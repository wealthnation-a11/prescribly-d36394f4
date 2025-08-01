import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Search, 
  MessageCircle, 
  Phone, 
  Video,
  MoreVertical,
  Clock,
  Wifi
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

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

interface Message {
  id: string;
  sender_id: string;
  conversation_id: string;
  message_text: string;
  created_at: string;
  sender_type: 'patient' | 'doctor';
  sender_name?: string;
  sender_avatar?: string;
}

interface Conversation {
  id: string;
  doctor: Doctor;
  last_message?: Message;
  unread_count?: number;
}

export default function Chat() {
  const { user } = useAuth();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      fetchConversations();
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
      const { data: doctors, error } = await supabase
        .from('doctors')
        .select(`
          id,
          user_id,
          specialization,
          bio,
          profiles!inner(
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('verification_status', 'approved');

      if (error) throw error;

      const formattedConversations: Conversation[] = doctors?.map(doctor => ({
        id: `${user?.id}-${doctor.user_id}`,
        doctor: {
          ...doctor,
          first_name: doctor.profiles?.first_name,
          last_name: doctor.profiles?.last_name,
          avatar_url: doctor.profiles?.avatar_url,
          online_status: Math.random() > 0.5 // Mock online status
        }
      })) || [];

      setConversations(formattedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load doctors',
        variant: 'destructive'
      });
    }
  };

  const fetchMessages = async (doctorId: string) => {
    try {
      const conversationId = `${user?.id}-${doctorId}`;
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = data?.map(msg => ({
        ...msg,
        sender_type: (msg.sender_type as 'patient' | 'doctor') || 'patient',
        sender_name: msg.sender_id === user?.id ? 'You' : selectedDoctor?.first_name || 'Doctor',
        sender_avatar: msg.sender_id === user?.id ? user?.user_metadata?.avatar_url : selectedDoctor?.avatar_url
      })) || [];

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!selectedDoctor || !user) return;

    const conversationId = `${user.id}-${selectedDoctor.user_id}`;
    
    const channel = supabase
      .channel('message-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          newMessage.sender_name = newMessage.sender_id === user.id ? 'You' : selectedDoctor?.first_name || 'Doctor';
          newMessage.sender_avatar = newMessage.sender_id === user.id ? user?.user_metadata?.avatar_url : selectedDoctor?.avatar_url;
          
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedDoctor || !user) return;

    setIsLoading(true);
    setIsTyping(true);

    try {
      const conversationId = `${user.id}-${selectedDoctor.user_id}`;
      
      const { error } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          conversation_id: conversationId,
          sender_id: user.id,
          message_text: newMessage.trim(),
          sender_type: 'patient'
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
      setIsTyping(false);
    }
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

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <div className="flex h-full">
            {/* Conversations Sidebar */}
            <div className="w-80 border-r border-border bg-card flex flex-col">
              <div className="p-4 border-b border-border">
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
                      <p className="body-medium">No doctors available</p>
                      <p className="body-small">Please book an appointment first</p>
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
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                message.sender_id === user?.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="body-medium">{message.message_text}</p>
                              <p className={`body-small mt-1 ${
                                message.sender_id === user?.id
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                              }`}>
                                {formatTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        ))
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
                  <div className="p-4 border-t border-border bg-card">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button
                        onClick={sendMessage}
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