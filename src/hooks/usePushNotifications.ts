import { useEffect, useState, useCallback } from 'react';

export const usePushNotifications = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      const perm = Notification.permission;
      setPermission(perm);
      setIsSubscribed(perm === 'granted');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setIsSubscribed(result === 'granted');
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    // We can't revoke permission programmatically, but we track the user's preference
    setIsSubscribed(false);
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          ...options,
        });
      } catch {
        // Fallback: some browsers don't support new Notification() directly
      }
    }
  }, []);

  return {
    isSubscribed,
    permission,
    requestPermission,
    unsubscribe,
    showNotification,
  };
};
