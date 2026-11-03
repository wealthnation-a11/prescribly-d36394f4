import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Public half of the push key pair (safe to ship in the app).
const VAPID_PUBLIC_KEY =
  "BDny4V49K3y5zyLFUHrdc2rEYujKXqDGweg6YgVzCxoNHBUF6pjKNaNAlPvCWC8avW8rT47_yuYbwp_CU1i3Daw";
const SW_URL = "/sw-push.js";
const SW_SCOPE = "/push/";

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export async function enableDoctorAlerts(userId: string) {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications were blocked. Allow them in your phone's browser settings.");
  const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID_PUBLIC_KEY) });
  const j = sub.toJSON();
  await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", sub.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: userId, endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? null, auth: j.keys?.auth ?? null,
  });
  if (error) throw error;
}

export function DoctorAlertsBanner() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !supported() || sessionStorage.getItem("doctor-alerts-dismissed")) return;
    (async () => {
      const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
      const sub = await reg?.pushManager.getSubscription();
      setShow(!(Notification.permission === "granted" && sub));
    })().catch(() => setShow(true));
  }, [user]);

  if (!show || !user) return null;

  const enable = async () => {
    setBusy(true);
    try {
      await enableDoctorAlerts(user.id);
      toast.success("Phone alerts are on. You'll be alerted when a patient is waiting.");
      setShow(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not turn on alerts");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:p-4 flex items-start gap-3">
      <BellRing className="w-5 h-5 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">Turn on phone alerts for waiting patients</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your phone will pop up and vibrate when a patient enters the waiting room — even when this page is closed.
        </p>
        <Button size="sm" className="mt-2" onClick={enable} disabled={busy}>
          {busy ? "Turning on…" : "Turn on phone alerts"}
        </Button>
      </div>
      <button
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => { sessionStorage.setItem("doctor-alerts-dismissed", "1"); setShow(false); }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
