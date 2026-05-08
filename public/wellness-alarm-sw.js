// Background alarm service worker.
// Reads scheduled alarms from IndexedDB and fires Notifications in the background.
// Communicates with the page via postMessage to update DB-backed state.

const DB_NAME = 'wellness-alarms';
const STORE = 'alarms';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('fireAt', 'fireAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function listDue() {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const now = Date.now();
      resolve((req.result || []).filter((a) => !a.fired && a.fireAt <= now + 1000));
    };
  });
}

async function markFired(id) {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const r = store.get(id);
    r.onsuccess = () => {
      const a = r.result;
      if (a) {
        a.fired = true;
        store.put(a);
      }
      tx.oncomplete = () => resolve();
    };
  });
}

async function checkAndFire() {
  try {
    const due = await listDue();
    for (const a of due) {
      await self.registration.showNotification(a.title || 'Wellness reminder', {
        body: a.body || '',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: a.tag || a.id,
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
        data: { url: a.url || '/health-challenges', kind: a.kind, refId: a.refId, id: a.id },
        actions: [
          { action: 'taken', title: '✓ Done' },
          { action: 'missed', title: '✗ Skip' },
        ],
      });
      await markFired(a.id);
    }
  } catch (e) {
    console.error('alarm check failed', e);
  }
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'CHECK_NOW') checkAndFire();
});

// Periodic Sync (Chrome/Android, when granted)
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'wellness-alarm-check') {
    e.waitUntil(checkAndFire());
  }
});

// Fallback: every time the SW wakes (push, fetch, etc.) check alarms
self.addEventListener('sync', (e) => {
  if (e.tag === 'wellness-alarm-check') {
    e.waitUntil(checkAndFire());
  }
});

// Push fallback (works when subscription exists)
self.addEventListener('push', (e) => {
  e.waitUntil(checkAndFire());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data || {};
  const url = data.url || '/health-challenges';

  if (e.action === 'taken' || e.action === 'missed') {
    e.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
        const action = e.action;
        cs.forEach((c) =>
          c.postMessage({ type: 'WELLNESS_ALARM_ACTION', action, kind: data.kind, refId: data.refId, id: data.id })
        );
        if (cs.length === 0 && self.clients.openWindow) {
          return self.clients.openWindow(url + '?alarmAction=' + action + '&id=' + (data.id || ''));
        }
      })
    );
    return;
  }

  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((cs) => {
      for (const c of cs) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
