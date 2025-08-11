import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
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
  Calendar,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface PatientProfile {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  online_status?: boolean;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message?: string | null;
  file_url?: string | null;
  file_type?: "image" | "pdf" | "docx" | "audio" | null;
  created_at: string;
}

export const DoctorMessages = () => {
  const { user } = useAuth();

  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user?.id) return;
    fetchEligiblePatients();
  }, [user?.id]);

  useEffect(() => {
    if (selectedPatient && user) {
      fetchMessages(selectedPatient.user_id);
      const unsub = subscribeToMessages(selectedPatient.user_id);
      return () => {
        unsub?.();
      };
    }
  }, [selectedPatient, user]);

  const fetchEligiblePatients = async () => {
    try {
      // 1) Get distinct patients from eligible appointments
      const nowIso = new Date().toISOString();
      const { data: appts, error: apptErr } = await supabase
        .from("appointments")
        .select("patient_id, status, scheduled_time")
        .eq("doctor_id", user!.id)
        .or(`status.eq.completed,and(status.eq.scheduled,scheduled_time.lte.${nowIso})`);

      if (apptErr) throw apptErr;

      const uniqueIds = Array.from(new Set((appts || []).map((a: any) => a.patient_id)));
      if (uniqueIds.length === 0) {
        setPatients([]);
        return;
      }

      // 2) Try fetching patient profiles (RLS allows viewing completed patients; confirmed may fallback)
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url")
        .in("user_id", uniqueIds);

      if (profErr) {
        // Not fatal; we can still show anonymous entries
        console.warn("Profile fetch warning:", profErr.message);
      }

      const profilesMap = new Map(
        (profiles || []).map((p: any) => [p.user_id, p])
      );

      const list: PatientProfile[] = uniqueIds.map((id) => ({
        user_id: id,
        first_name: profilesMap.get(id)?.first_name || null,
        last_name: profilesMap.get(id)?.last_name || null,
        avatar_url: profilesMap.get(id)?.avatar_url || null,
        online_status: Math.random() > 0.5,
      }));

      setPatients(list);
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast({
        title: "Error",
        description: "Failed to load eligible patients.",
        variant: "destructive",
      });
    }
  };

  const fetchMessages = async (patientUserId: string) => {
    try {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .or(
          `and(sender_id.eq.${user?.id},recipient_id.eq.${patientUserId}),and(sender_id.eq.${patientUserId},recipient_id.eq.${user?.id})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data || []) as ChatMessage[]);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const subscribeToMessages = (patientUserId: string) => {
    if (!user) return;

    const channel = supabase
      .channel("doctor-chat-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chats",
          filter: `or(and(sender_id.eq.${user.id},recipient_id.eq.${patientUserId}),and(sender_id.eq.${patientUserId},recipient_id.eq.${user.id}))`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMsg]);
          if (newMsg.sender_id !== user.id) {
            toast({ title: "New Message", description: "Message from patient" });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (
    messageContent?: string,
    fileUrl?: string,
    fileType?: string
  ) => {
    if ((!newMessage.trim() && !messageContent && !fileUrl) || !selectedPatient || !user) return;

    setIsLoading(true);
    setIsTyping(true);
    try {
      const { error } = await supabase.from("chats").insert({
        sender_id: user.id,
        recipient_id: selectedPatient.user_id,
        message: messageContent || newMessage.trim() || undefined,
        file_url: fileUrl,
        file_type: fileType as any,
      });
      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedPatient || !user) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload images, PDFs, or Word documents.",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("chat-files").upload(fileName, file);
      if (error) throw error;

      const { data: pub } = supabase.storage.from("chat-files").getPublicUrl(fileName);

      let type: string;
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type === "application/pdf") type = "pdf";
      else if (file.type.includes("wordprocessing")) type = "docx";
      else type = "image";

      await sendMessage(`Shared a ${type}`, pub.publicUrl, type);
      toast({ title: "File Uploaded", description: "File shared successfully." });
    } catch (err) {
      console.error("Upload error:", err);
      toast({ title: "Upload Error", description: "Failed to upload file.", variant: "destructive" });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);
      setIsRecording(true);

      recorder.ondataavailable = (e) => setAudioChunks((prev) => [...prev, e.data]);
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const fileName = `${user?.id}/${Date.now()}_voice_note.wav`;
        try {
          const { error } = await supabase.storage.from("chat-files").upload(fileName, audioBlob);
          if (error) throw error;
          const { data: pub } = supabase.storage.from("chat-files").getPublicUrl(fileName);
          await sendMessage("Sent a voice note", pub.publicUrl, "audio");
          toast({ title: "Voice Note Sent", description: "Your voice note has been shared." });
        } catch (e) {
          console.error("Voice upload error:", e);
          toast({ title: "Upload Error", description: "Failed to upload voice note.", variant: "destructive" });
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
    } catch (error) {
      console.error("Recording error:", error);
      toast({ title: "Recording Error", description: "Could not access microphone.", variant: "destructive" });
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

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const filteredPatients = patients.filter((p) =>
    `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMessage = (m: ChatMessage) => {
    const isOwn = m.sender_id === user?.id;
    return (
      <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[70%] rounded-lg p-3 ${isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          {m.file_url ? (
            <div className="space-y-2">
              {m.file_type === "image" && (
                <img src={m.file_url} alt="Shared image" className="max-w-full h-auto rounded" />
              )}
              {m.file_type === "audio" && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => playAudio(m.file_url!)}>
                    {playingAudio === m.file_url ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <span className="text-sm">Voice Note</span>
                </div>
              )}
              {(m.file_type === "pdf" || m.file_type === "docx") && (
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                    Download {m.file_type?.toUpperCase()}
                  </a>
                </div>
              )}
              {m.message && <p className="body-medium">{m.message}</p>}
            </div>
          ) : (
            <p className="body-medium">{m.message}</p>
          )}
          <p className={`body-small mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{formatTime(m.created_at)}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Patient Messages</h1>
        <p className="text-muted-foreground">Securely chat with patients after confirmed/completed appointments</p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {/* Patients Sidebar */}
            <div className="md:col-span-1 border-r border-border bg-card flex flex-col min-h-[70vh]">
              <div className="p-4 border-b border-border">
                <h2 className="heading-lg mb-4">Your Patients</h2>
                <div className="relative">
                  <Input
                    placeholder="Search patients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-3"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2">
                  {filteredPatients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="body-medium">No chat-enabled patients</p>
                      <p className="body-small">Chats appear after eligible appointments</p>
                    </div>
                  ) : (
                    filteredPatients.map((p) => (
                      <Card
                        key={p.user_id}
                        className={`mb-2 cursor-pointer transition-all hover:bg-accent/50 ${
                          selectedPatient?.user_id === p.user_id ? "bg-primary/10 border-primary" : ""
                        }`}
                        onClick={() => setSelectedPatient(p)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="w-12 h-12">
                                <AvatarImage src={p.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {(p.first_name?.[0] || "P") + (p.last_name?.[0] || " ")}
                                </AvatarFallback>
                              </Avatar>
                              {p.online_status && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="body-medium font-semibold">
                                {p.first_name || "Patient"} {p.last_name || ""}
                              </p>
                              <Badge variant="outline" className="mt-1">
                                Chat Enabled
                              </Badge>
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
            <div className="md:col-span-2 flex flex-col min-h-[70vh]">
              {selectedPatient ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-border bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={selectedPatient.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {(selectedPatient.first_name?.[0] || "P") + (selectedPatient.last_name?.[0] || " ")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="body-medium font-semibold">
                            {selectedPatient.first_name || "Patient"} {selectedPatient.last_name || ""}
                          </h3>
                          <p className="body-small text-muted-foreground">Secure chat</p>
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

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="body-medium">Start a conversation</p>
                          <p className="body-small">Send a message to begin chatting with the patient</p>
                        </div>
                      ) : (
                        messages.map(renderMessage)
                      )}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg p-3 max-w-[70%]">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Composer */}
                  <div className="p-4 border-t border-border bg-card space-y-3">
                    {/* Schedule Call (placeholder) */}
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
                          <p className="text-muted-foreground">Video and voice calling features will be available soon.</p>
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
                      <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="px-3">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`px-3 ${isRecording ? "text-red-500" : ""}`}
                      >
                        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                      <Button onClick={() => sendMessage()} disabled={!newMessage.trim() || isLoading} size="sm" className="px-3">
                        Send
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-muted/20">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="heading-md mb-2">Select a patient to start chatting</h3>
                    <p className="body-medium text-muted-foreground">Choose a patient from the list to begin the conversation</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorMessages;
