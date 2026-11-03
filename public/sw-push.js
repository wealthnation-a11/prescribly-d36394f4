// Dedicated push-notification worker for PrescriblyCare (no caching).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const urgent = data.type === 'consultation_waiting';
  const options = {
    body: data.body || 'New notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'prescriblycare',
    renotify: true,
    requireInteraction: urgent,
    vibrate: urgent ? [600, 200, 600, 200, 600, 200, 1000] : [200, 100, 200],
    data: { url: data.url || '/', type: data.type },
    actions: urgent ? [{ action: 'open', title: 'Accept & Connect' }] : [],
  };
  event.waitUntil(self.registration.showNotification(data.title || 'PrescriblyCare', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && 'focus' in c) {
          c.navigate(target);
          return c.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});
