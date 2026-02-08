import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Video, Phone, Send, MessageCircle } from 'lucide-react';
import { useMessaging } from '@/hooks/useMessaging';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import { CallInterface } from '@/components/CallInterface';
import { IncomingCallModal } from '@/components/IncomingCallModal';

const DoctorMessaging = () => {
  const { user, userProfile } = useAuth();
  const {
    messages,
    participants,
    selectedParticipant,
    setSelectedParticipant,
    sendMessage,
    isLoading,
    isDoctor
  } = useMessaging();
  
  const [newMessage, setNewMessage] = useState('');
  const {
    callState,
    incomingCall,
    localStream,
    remoteStream,
    startCall: startWebRTCCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
  } = useWebRTCCall();

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedParticipant) return;
    
    await sendMessage(newMessage, selectedParticipant.id);
    setNewMessage('');
  };

  const handleStartCall = async (audioOnly: boolean = false) => {
    if (!selectedParticipant?.appointmentId || !user?.id) return;

    try {
      const callerName = userProfile ? `Dr. ${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'Doctor';
      await startWebRTCCall(
        selectedParticipant.appointmentId,
        selectedParticipant.id,
        audioOnly ? 'voice' : 'video',
        callerName
      );
    } catch (error) {
      console.error('Error starting call:', error);
    }
  };

  if (!isDoctor) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Access denied. Doctor privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  // Show call interface if in a call
  if (callState.isConnecting || callState.isConnected) {
    return (
      <CallInterface
        callType={callState.callType || 'voice'}
        localStream={localStream}
        remoteStream={remoteStream}
        isAudioEnabled={callState.isAudioEnabled}
        isVideoEnabled={callState.isVideoEnabled}
        isConnected={callState.isConnected}
        onEndCall={endCall}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        remoteName={selectedParticipant?.name || 'Patient'}
        remoteAvatar={selectedParticipant?.avatar_url}
      />
    );
  }

  return (
    <>
      {/* Incoming call modal */}
      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callType={incomingCall.callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      <div className="w-full max-w-6xl mx-auto">
        <Card className="h-[600px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Patient Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex h-[500px]">
            {/* Participants Sidebar */}
            <div className="w-1/3 border-r">
              <div className="p-4">
                <h3 className="font-semibold mb-4">Patients</h3>
                <ScrollArea className="h-[400px]">
                  {participants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No approved patients yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {participants.map((participant) => (
                        <div
                          key={participant.id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedParticipant?.id === participant.id
                              ? 'bg-primary/10 border border-primary/20'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedParticipant(participant)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={participant.avatar_url} />
                              <AvatarFallback>
                                {participant.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {participant.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Patient
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedParticipant ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={selectedParticipant.avatar_url} />
                          <AvatarFallback>
                            {selectedParticipant.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{selectedParticipant.name}</h3>
                          <p className="text-sm text-muted-foreground">Patient</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleStartCall(true)}
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Voice Call
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleStartCall(false)}
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Video Call
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender === 'doctor' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2 rounded-lg ${
                              message.sender === 'doctor'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(message.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={isLoading || !newMessage.trim()}
                        size="sm"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Select a patient to start messaging</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose a patient from the sidebar to view your conversation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
};

export default DoctorMessaging;