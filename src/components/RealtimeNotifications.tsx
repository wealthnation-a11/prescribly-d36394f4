import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const RealtimeNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
              description: "You have received a new message.",
            });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
          }
        }
      )
      .subscribe();

    // Subscribe to all notifications for this user
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
          
          const destructiveTypes = ['appointment_cancelled'];
          const variant = destructiveTypes.includes(notification.type) ? 'destructive' as const : undefined;

          toast({
            title: notification.title,
            description: notification.message,
            variant,
          });

          // Invalidate relevant queries based on notification type
          if (notification.type?.startsWith('appointment')) {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['today-appointments'] });
            queryClient.invalidateQueries({ queryKey: ['pending-appointments'] });
          }
          if (notification.type === 'home_visit_request') {
            queryClient.invalidateQueries({ queryKey: ['home-visits'] });
          }
          queryClient.invalidateQueries({ queryKey: ['notification-count'] });
        }
      )
      .subscribe();

    // Subscribe to appointment status changes (for doctors seeing new bookings in real-time)
    const appointmentsChannel = supabase
      .channel('user-appointment-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          queryClient.invalidateQueries({ queryKey: ['today-appointments'] });
          queryClient.invalidateQueries({ queryKey: ['pending-appointments'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(appointmentsChannel);
    };
  }, [user?.id, toast, queryClient]);

  return null;
};

export default RealtimeNotifications;
