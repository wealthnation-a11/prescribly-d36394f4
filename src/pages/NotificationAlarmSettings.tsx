import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bell, BellRing, ShieldCheck, AlertTriangle, Volume2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  requestNotificationPermission, showNotification, scheduleBackgroundNotification,
  scheduleAlarm, playAlarmChime,
} from "@/lib/wellnessAlarm";
import { usePageSEO } from "@/hooks/usePageSEO";

const supportsTriggers = typeof window !== "undefined" && "TimestampTrigger" in window;
const isStandalone = typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches;

export default function NotificationAlarmSettings() {
  usePageSEO({ title: "Alarm & notification settings", description: "Test and manage background wellness alarms.", canonicalPath: "/alarm-settings" });
  const navigate = useNavigate();
  const [perm, setPerm] = useState<NotificationPermission>(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(() => setSwReady(true)).catch(() => setSwReady(false));
    }
  }, []);

  const ask = async () => {
    const ok = await requestNotificationPermission();
    setPerm(Notification.permission);
    toast({ title: ok ? "Notifications enabled" : "Permission not granted", description: ok ? "Background alarms can now reach you." : "You can change this in your browser/site settings." });
  };

  const testInstant = () => {
    playAlarmChime(4);
    showNotification("🔔 Test alarm", "If you can see this, foreground alarms work.");
  };

  const testIn30s = async () => {
    const fireAt = new Date(Date.now() + 30_000);
    scheduleAlarm("test:30s", fireAt, () => { playAlarmChime(6); showNotification("⏰ Scheduled test", "30-second test alarm."); });
    const sw = await scheduleBackgroundNotification("test-bg:30s", fireAt, "⏰ Background test", "If you see this with the tab closed, background alarms work.");
    toast({ title: "Test scheduled", description: sw ? "In-tab + background alarm in 30s. You can close the tab." : "In-tab alarm in 30s (background API unsupported here)." });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>

      <h1 className="text-2xl font-bold mb-1">Alarm & notification settings</h1>
      <p className="text-muted-foreground mb-6">Test how hydration, medication, sleep, steps and meditation alarms reach you.</p>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" /> Permission status</CardTitle>
          <CardDescription>Notifications must be allowed for alarms to fire.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={perm === "granted" ? "default" : perm === "denied" ? "destructive" : "secondary"}>{perm}</Badge>
            {perm !== "granted" && <Button size="sm" onClick={ask}><Bell className="w-4 h-4 mr-2" />Allow notifications</Button>}
          </div>
          {perm === "denied" && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Notifications are blocked. Open your browser site settings and re-enable notifications for this app.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Background capability</CardTitle>
          <CardDescription>Required so alarms fire when the tab is closed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Service Worker: <Badge variant={swReady ? "default" : "secondary"}>{swReady ? "ready" : "not ready"}</Badge></div>
          <div>Notification Triggers API: <Badge variant={supportsTriggers ? "default" : "secondary"}>{supportsTriggers ? "supported" : "unsupported"}</Badge></div>
          <div>Installed as PWA: <Badge variant={isStandalone ? "default" : "secondary"}>{isStandalone ? "yes" : "no"}</Badge></div>
          {!supportsTriggers && (
            <p className="text-xs text-muted-foreground">Background alarms with the tab fully closed are not supported on iOS Safari and Firefox. Install as a PWA on Chrome/Android for the best experience.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><BellRing className="w-4 h-4" /> Test delivery</CardTitle>
          <CardDescription>Run these to confirm your alarms will reach you.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <Button variant="outline" onClick={testInstant} disabled={perm !== "granted"}>
            <Volume2 className="w-4 h-4 mr-2" />Play a test chime now
          </Button>
          <Button onClick={testIn30s} disabled={perm !== "granted"}>
            <BellRing className="w-4 h-4 mr-2" />Schedule background test in 30s
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
