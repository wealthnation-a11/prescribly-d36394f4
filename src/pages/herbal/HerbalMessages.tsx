import { HerbalPractitionerLayout } from '@/components/HerbalPractitionerLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageSquare } from 'lucide-react';
import { useHerbalMessaging } from '@/hooks/useHerbalMessaging';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function HerbalMessages() {
  const {
    messages,
    participants,
    selectedParticipant,
    setSelectedParticipant,
    sendMessage,
    loading,
  } = useHerbalMessaging();
  
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedParticipant) return;
    
    await sendMessage(newMessage, selectedParticipant.id);
    setNewMessage('');
  };

  if (loading) {
    return (
      <HerbalPractitionerLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </HerbalPractitionerLayout>
    );
  }

  return (
    <HerbalPractitionerLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Communicate with your patients</p>
        </div>

        {participants.length === 0 ? (
          <Card>
            <CardContent className="p-8 sm:p-12 text-center">
              <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">No Conversations Yet</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                You'll see your patient conversations here once they book consultations
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-4 h-[600px]">
            {/* Participants List */}
            <Card className="md:col-span-1">
              <CardHeader className="pb-3">
                <h3 className="font-semibold">Conversations</h3>
              </CardHeader>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2 p-4">
                  {participants.map((participant) => (
                    <Button
                      key={participant.id}
                      variant={selectedParticipant?.id === participant.id ? 'secondary' : 'ghost'}
                      className="w-full justify-start gap-3"
                      onClick={() => setSelectedParticipant(participant)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{participant.name}</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            {/* Messages Area */}
            <Card className="md:col-span-2">
              {selectedParticipant ? (
                <>
                  <CardHeader className="border-b">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {selectedParticipant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{selectedParticipant.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {selectedParticipant.type}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <ScrollArea className="h-[400px] p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender_type === 'practitioner' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.sender_type === 'practitioner'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <Button onClick={handleSendMessage} size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select a conversation to start messaging</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </HerbalPractitionerLayout>
  );
}
