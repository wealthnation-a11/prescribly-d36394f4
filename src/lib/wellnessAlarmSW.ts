// Client-side helper to register the wellness alarm service worker,
// store alarms in IndexedDB (so they fire even when the tab is closed),
// and request periodic background sync where supported.

const DB_NAME = "wellness-alarms";
const STORE = "alarms";

export type QueuedAlarm = {
  id: string;
  fireAt: number;
  title: string;
  body: string;
  tag?: string;
  url?: string;
  kind: "water" | "medication" | "sleep" | "meditation";
  refId?: string;
  fired?: boolean;
};

let _swReg: ServiceWorkerRegistration | null = null;

export const registerWellnessAlarmSW = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/wellness-alarm-sw.js", { scope: "/" });
    _swReg = reg;
    // Try periodic sync (Chrome only, install-as-PWA usually required)
    try {
      // @ts-ignore
      const pSync = (reg as any).periodicSync;
      if (pSync) {
        // @ts-ignore
        const status = await navigator.permissions.query({ name: "periodic-background-sync" as any });
        if (status.state === "granted") {
          await pSync.register("wellness-alarm-check", { minInterval: 5 * 60 * 1000 });
        }
      }
    } catch {}
    // Poll while page is open as a guaranteed fallback
    setInterval(() => reg.active?.postMessage({ type: "CHECK_NOW" }), 30 * 1000);
    return reg;
  } catch (e) {
    console.warn("wellness-alarm-sw registration failed", e);
    return null;
  }
};

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: "id" });
        s.createIndex("fireAt", "fireAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const queueLocalAlarm = async (a: QueuedAlarm) => {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...a, fired: false });
    tx.oncomplete = () => resolve();
  });
  // Wake SW so it has a fresh schedule
  _swReg?.active?.postMessage({ type: "CHECK_NOW" });
};

export const queueLocalAlarms = async (alarms: QueuedAlarm[]) => {
  for (const a of alarms) await queueLocalAlarm(a);
};

export const clearLocalAlarmsForKind = async (kind: QueuedAlarm["kind"]) => {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      (req.result as QueuedAlarm[]).forEach((a) => {
        if (a.kind === kind) store.delete(a.id);
      });
    };
    tx.oncomplete = () => resolve();
  });
};

export const onWellnessAlarmAction = (
  cb: (e: { action: "taken" | "missed"; kind: QueuedAlarm["kind"]; refId?: string; id?: string }) => void
) => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data?.type === "WELLNESS_ALARM_ACTION") cb(event.data);
  };
  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
};
