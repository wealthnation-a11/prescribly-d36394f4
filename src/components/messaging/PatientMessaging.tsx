import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Video, Phone, Send, MessageCircle, Calendar, AlertCircle } from 'lucide-react';
import { useMessaging } from '@/hooks/useMessaging';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ConsultationAccessGuard } from '@/components/ConsultationAccessGuard';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import { CallInterface } from '@/components/CallInterface';
import { IncomingCallModal } from '@/components/IncomingCallModal';

const PatientMessaging = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const {
    messages,
    participants,
    selectedParticipant,
    setSelectedParticipant,
    sendMessage,
    isLoading,
    isPatient
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
      const callerName = userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'Patient';
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

  if (!isPatient) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Access denied. Patient privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  // No approved appointments case
  if (participants.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle>No Approved Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            You must book and be approved for an appointment before you can chat or call.
          </p>
          <Button onClick={() => navigate('/book-appointment')} className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            Book an Appointment
          </Button>
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
        remoteName={selectedParticipant ? `Dr. ${selectedParticipant.name}` : 'Doctor'}
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
            Doctor Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex h-[500px]">
            {/* Participants Sidebar */}
            <div className="w-1/3 border-r">
              <div className="p-4">
                <h3 className="font-semibold mb-4">Doctors</h3>
                <ScrollArea className="h-[400px]">
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
                              Dr. {participant.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              Dr. {participant.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Available for consultation
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                            Dr. {selectedParticipant.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">Dr. {selectedParticipant.name}</h3>
                          <p className="text-sm text-muted-foreground">Available for consultation</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <ConsultationAccessGuard 
                          appointmentId={selectedParticipant.appointmentId || ''} 
                          doctorName={selectedParticipant.name}
                          featureType="call"
                        >
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleStartCall(true)}
                          >
                            <Phone className="w-4 h-4 mr-2" />
                            Voice Call
                          </Button>
                        </ConsultationAccessGuard>
                        <ConsultationAccessGuard 
                          appointmentId={selectedParticipant.appointmentId || ''} 
                          doctorName={selectedParticipant.name}
                          featureType="call"
                        >
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleStartCall(false)}
                          >
                            <Video className="w-4 h-4 mr-2" />
                            Video Call
                          </Button>
                        </ConsultationAccessGuard>
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
                            message.sender === 'patient' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2 rounded-lg ${
                              message.sender === 'patient'
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
                  <ConsultationAccessGuard 
                    appointmentId={selectedParticipant.appointmentId || ''} 
                    doctorName={selectedParticipant.name}
                    featureType="chat"
                  >
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
                  </ConsultationAccessGuard>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Select a doctor to start messaging</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose a doctor from the sidebar to view your conversation.
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

export default PatientMessaging;