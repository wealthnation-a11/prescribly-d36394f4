import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  doctor_id: string;
  patient_id: string;
  content: string;
  sender: 'doctor' | 'patient';
  created_at: string;
}

interface ChatParticipant {
  id: string;
  name: string;
  avatar_url?: string;
  last_message?: string;
  last_message_time?: string;
}

export const useMessaging = () => {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<ChatParticipant | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const userRole = userProfile?.role;
  const isDoctor = userRole === 'doctor';
  const isPatient = userRole === 'patient';

  // Load participants (doctors for patients, patients for doctors)
  const loadParticipants = useCallback(async () => {
    if (!user?.id || !userRole) return;

    try {
      if (isDoctor) {
        // Get patients with approved appointments
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('patient_id')
          .eq('doctor_id', user.id)
          .eq('status', 'approved');

        if (appointmentsError) throw appointmentsError;

        if (appointments && appointments.length > 0) {
          const patientIds = [...new Set(appointments.map(apt => apt.patient_id))];
          
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, avatar_url')
            .in('user_id', patientIds);

          if (profilesError) throw profilesError;

          const participantList: ChatParticipant[] = profiles?.map((profile: any) => ({
            id: profile.user_id,
            name: `${profile.first_name} ${profile.last_name}`,
            avatar_url: profile.avatar_url,
          })) || [];

          setParticipants(participantList);
        } else {
          setParticipants([]);
        }
      } else {
        // Get doctors with approved appointments
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('doctor_id')
          .eq('patient_id', user.id)
          .eq('status', 'approved');

        if (appointmentsError) throw appointmentsError;

        if (appointments && appointments.length > 0) {
          const doctorIds = [...new Set(appointments.map(apt => apt.doctor_id))];
          
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, avatar_url')
            .in('user_id', doctorIds);

          if (profilesError) throw profilesError;

          const participantList: ChatParticipant[] = profiles?.map((profile: any) => ({
            id: profile.user_id,
            name: `${profile.first_name} ${profile.last_name}`,
            avatar_url: profile.avatar_url,
          })) || [];

          setParticipants(participantList);
        } else {
          setParticipants([]);
        }
      }
    } catch (error) {
      console.error('Error loading participants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive'
      });
    }
  }, [user?.id, userRole, isDoctor]);

  // Load messages for selected participant
  const loadMessages = useCallback(async (participantId: string) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          isDoctor 
            ? `and(doctor_id.eq.${user.id},patient_id.eq.${participantId})`
            : `and(doctor_id.eq.${participantId},patient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive'
      });
    }
  }, [user?.id, isDoctor]);

  // Send message
  const sendMessage = useCallback(async (content: string, recipientId: string) => {
    if (!user?.id || !content.trim()) return;

    setIsLoading(true);
    try {
      const messageData = isDoctor ? {
        doctor_id: user.id,
        patient_id: recipientId,
        content: content.trim(),
        sender: 'doctor' as const
      } : {
        doctor_id: recipientId,
        patient_id: user.id,
        content: content.trim(),
        sender: 'patient' as const
      };

      const { error } = await supabase
        .from('messages')
        .insert([messageData]);

      if (error) throw error;
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
  }, [user?.id, isDoctor]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!user?.id || !selectedParticipant) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: isDoctor 
            ? `doctor_id=eq.${user.id},patient_id=eq.${selectedParticipant.id}`
            : `doctor_id=eq.${selectedParticipant.id},patient_id=eq.${user.id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          
          // Show toast for messages from others
          if (newMessage.sender !== (isDoctor ? 'doctor' : 'patient')) {
            toast({
              title: 'New Message',
              description: `Message from ${selectedParticipant.name}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedParticipant, isDoctor]);

  // Load participants on mount
  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  // Load messages when participant is selected
  useEffect(() => {
    if (selectedParticipant) {
      loadMessages(selectedParticipant.id);
    }
  }, [selectedParticipant, loadMessages]);

  return {
    messages,
    participants,
    selectedParticipant,
    setSelectedParticipant,
    sendMessage,
    isLoading,
    userRole,
    isDoctor,
    isPatient
  };
};