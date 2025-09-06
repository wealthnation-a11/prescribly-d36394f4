import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const RealtimeNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to chat messages
    const messagesChannel = supabase
      .channel('user-message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          const message = payload.new as any;
          if (message.sender_id !== user.id) {
            toast({
              title: "New Message",
              description: "You have received a new message from your doctor.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [user?.id, toast]);

  return null; // This component doesn't render anything
};

export default RealtimeNotifications;