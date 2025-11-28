import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_type: 'practitioner' | 'patient';
  content: string;
  created_at: string;
  read: boolean;
}

interface Participant {
  id: string;
  name: string;
  avatar_url?: string;
  type: 'practitioner' | 'patient';
}

export const useHerbalMessaging = () => {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);

  const isPractitioner = userProfile?.role === 'herbal_practitioner';

  // Load participants (patients for practitioners, practitioners for patients)
  const loadParticipants = async () => {
    if (!user) return;

    try {
      if (isPractitioner) {
        // Get practitioner ID
        const { data: practitionerData } = await supabase
          .from('herbal_practitioners')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!practitionerData) return;

        // Get patients who have consultations
        const { data: consultations } = await supabase
          .from('herbal_consultations')
          .select(`
            patient_id,
            profiles:patient_id (
              user_id,
              first_name,
              last_name,
              avatar_url
            )
          `)
          .eq('practitioner_id', practitionerData.id)
          .in('status', ['approved', 'scheduled']);

        if (consultations) {
          const uniquePatients = Array.from(
            new Map(
              consultations
                .filter(c => c.profiles)
                .map(c => [
                  c.patient_id,
                  {
                    id: c.patient_id,
                    name: `${(c.profiles as any).first_name} ${(c.profiles as any).last_name}`,
                    avatar_url: (c.profiles as any).avatar_url,
                    type: 'patient' as const,
                  }
                ])
            ).values()
          );
          setParticipants(uniquePatients);
        }
      } else {
        // Get practitioners patient has consultations with
        const { data: consultations } = await supabase
          .from('herbal_consultations')
          .select(`
            practitioner_id,
            herbal_practitioners (
              id,
              first_name,
              last_name,
              user_id
            )
          `)
          .eq('patient_id', user.id)
          .in('status', ['approved', 'scheduled']);

        if (consultations) {
          const uniquePractitioners = Array.from(
            new Map(
              consultations
                .filter(c => c.herbal_practitioners)
                .map(c => [
                  (c.herbal_practitioners as any).id,
                  {
                    id: (c.herbal_practitioners as any).id,
                    name: `${(c.herbal_practitioners as any).first_name} ${(c.herbal_practitioners as any).last_name}`,
                    type: 'practitioner' as const,
                  }
                ])
            ).values()
          );
          setParticipants(uniquePractitioners);
        }
      }
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load messages for selected participant
  const loadMessages = async (participantId: string) => {
    if (!user) return;

    try {
      let query = supabase
        .from('herbal_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (isPractitioner) {
        query = query
          .eq('practitioner_id', participantId)
          .eq('patient_id', user.id);
      } else {
        query = query
          .eq('practitioner_id', participantId)
          .eq('patient_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  // Send message
  const sendMessage = async (content: string, participantId: string) => {
    if (!user || !content.trim()) return;

    try {
      const messageData: any = {
        content: content.trim(),
        sender_type: isPractitioner ? 'practitioner' : 'patient',
        read: false,
      };

      if (isPractitioner) {
        // Get practitioner ID
        const { data: practitionerData } = await supabase
          .from('herbal_practitioners')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!practitionerData) throw new Error('Practitioner not found');

        messageData.practitioner_id = practitionerData.id;
        messageData.patient_id = participantId;
      } else {
        messageData.practitioner_id = participantId;
        messageData.patient_id = user.id;
      }

      const { error } = await supabase
        .from('herbal_messages')
        .insert(messageData);

      if (error) throw error;

      toast.success('Message sent');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Subscribe to real-time messages
  useEffect(() => {
    if (!selectedParticipant || !user) return;

    const channel = supabase
      .channel('herbal_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'herbal_messages',
          filter: isPractitioner
            ? `patient_id=eq.${selectedParticipant.id}`
            : `practitioner_id=eq.${selectedParticipant.id}`,
        },
        (payload) => {
          setMessages((current) => [...current, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedParticipant, user, isPractitioner]);

  useEffect(() => {
    loadParticipants();
  }, [user?.id]);

  useEffect(() => {
    if (selectedParticipant) {
      loadMessages(selectedParticipant.id);
    }
  }, [selectedParticipant]);

  return {
    messages,
    participants,
    selectedParticipant,
    setSelectedParticipant,
    sendMessage,
    loading,
  };
};