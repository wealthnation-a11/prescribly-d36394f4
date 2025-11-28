import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export const useNativePushNotifications = () => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default'>('default');
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isNative) {
      checkNativePermission();
    } else if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, [isNative]);

  const checkNativePermission = async () => {
    if (!isNative) return;
    
    const result = await PushNotifications.checkPermissions();
    setPermission(result.receive === 'granted' ? 'granted' : 'denied');
  };

  const requestPermission = async () => {
    if (isNative) {
      return requestNativePermission();
    } else {
      return requestWebPermission();
    }
  };

  const requestNativePermission = async () => {
    if (!user) return false;

    try {
      let permissionResult = await PushNotifications.checkPermissions();
      
      if (permissionResult.receive === 'prompt') {
        permissionResult = await PushNotifications.requestPermissions();
      }

      if (permissionResult.receive === 'granted') {
        await PushNotifications.register();
        setPermission('granted');
        
        // Listen for registration
        await PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token: ' + token.value);
          
          // Save token to database
          const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
              user_id: user.id,
              endpoint: token.value,
              p256dh: 'native-android',
              auth: 'native-android'
            }, {
              onConflict: 'user_id,endpoint'
            });

          if (error) throw error;
          
          setIsSubscribed(true);
          toast.success('Push notifications enabled!');
        });

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration: ' + JSON.stringify(error));
          toast.error('Failed to enable push notifications');
        });

        return true;
      } else {
        toast.error('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting native notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  };

  const requestWebPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support notifications');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      toast.error('Service workers are not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        // Use existing web push logic from usePushNotifications.ts
        toast.success('Push notifications enabled!');
        return true;
      } else {
        toast.error('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  };

  const unsubscribe = async () => {
    if (!user) return;

    try {
      if (isNative) {
        await PushNotifications.removeAllListeners();
        await PushNotifications.unregister();
      }
      
      // Remove from database
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      
      setIsSubscribed(false);
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast.error('Failed to disable push notifications');
    }
  };

  return {
    isSubscribed,
    permission,
    requestPermission,
    unsubscribe,
    isNative
  };
};
