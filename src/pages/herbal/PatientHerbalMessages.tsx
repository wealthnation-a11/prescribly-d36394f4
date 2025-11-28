import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useHerbalMessaging } from '@/hooks/useHerbalMessaging';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileHeader } from '@/components/MobileHeader';
import { useLocation } from 'react-router-dom';

export default function PatientHerbalMessages() {
  const { user } = useAuth();
  const location = useLocation();
  const { messages, participants, selectedParticipant, setSelectedParticipant, sendMessage, loading } = useHerbalMessaging();
  const [messageText, setMessageText] = useState('');

  // Auto-select practitioner if passed via navigation state
  useEffect(() => {
    if (location.state?.practitionerId && participants.length > 0) {
      const practitioner = participants.find(p => p.id === location.state.practitionerId);
      if (practitioner) {
        setSelectedParticipant(practitioner);
      }
    }
  }, [location.state, participants, setSelectedParticipant]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedParticipant) return;
    await sendMessage(messageText, selectedParticipant.id);
    setMessageText('');
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <MobileHeader title="Messages" />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Messages</h1>
                  <p className="text-sm sm:text-base text-muted-foreground">Chat with your herbal practitioners</p>
                </div>
                <SidebarTrigger className="lg:hidden" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
                {/* Practitioners List */}
                <Card className="md:col-span-1">
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="text-base sm:text-lg">Practitioners</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      {loading ? (
                        <div className="p-4 text-sm text-muted-foreground">Loading...</div>
                      ) : participants.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          No practitioners available. Book a consultation first.
                        </div>
                      ) : (
                        participants.map((participant) => (
                          <button
                            key={participant.id}
                            onClick={() => setSelectedParticipant(participant)}
                            className={`w-full p-4 text-left hover:bg-accent transition-colors border-b ${
                              selectedParticipant?.id === participant.id ? 'bg-accent' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{participant.name}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Messages Area */}
                <Card className="md:col-span-2">
                  <CardHeader className="px-4 sm:px-6 border-b">
                    <CardTitle className="text-base sm:text-lg">
                      {selectedParticipant ? selectedParticipant.name : 'Select a practitioner'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex flex-col h-[500px]">
                    <ScrollArea className="flex-1 p-4">
                      {!selectedParticipant ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          Select a practitioner to start messaging
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          No messages yet. Start the conversation!
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.sender_type === 'patient' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] p-3 rounded-lg text-sm ${
                                  message.sender_type === 'patient'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="break-words">{message.content}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {new Date(message.created_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>

                    {selectedParticipant && (
                      <div className="p-4 border-t">
                        <div className="flex gap-2">
                          <Input
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Type your message..."
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1"
                          />
                          <Button onClick={handleSendMessage} size="icon" disabled={!messageText.trim()}>
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
