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

    // Subscribe to appointment notifications  
    const notificationsChannel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new as any;
          
          // Show toast for appointment-related notifications
          if (notification.type === 'appointment_request') {
            toast({
              title: notification.title,
              description: notification.message,
            });
          } else if (notification.type === 'appointment_approved') {
            toast({
              title: notification.title,
              description: notification.message,
            });
          } else if (notification.type === 'appointment_cancelled') {
            toast({
              title: notification.title,
              description: notification.message,
              variant: "destructive",
            });
          } else if (notification.type === 'appointment_completed') {
            toast({
              title: notification.title,
              description: notification.message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user?.id, toast]);

  return null; // This component doesn't render anything
};

export default RealtimeNotifications;