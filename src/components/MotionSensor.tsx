import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";

interface MotionSensorProps {
  onStepDetected: () => void;
  isActive: boolean;
}

/**
 * Real-time pedometer using Capacitor Motion when running natively,
 * falling back to the browser's DeviceMotion API in the PWA.
 */
export default function MotionSensor({ onStepDetected, isActive }: MotionSensorProps) {
  const { toast } = useToast();
  const lastStepTime = useRef(0);
  const accelerationWindow = useRef<number[]>([]);
  const listenerHandle = useRef<any>(null);
  const stepThreshold = 11.5; // m/s^2 spike magnitude
  const minStepInterval = 280; // ms between steps

  useEffect(() => {
    if (!isActive) {
      void stop();
      return;
    }
    void start();
    return () => {
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const processSample = (x: number, y: number, z: number) => {
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    accelerationWindow.current.push(magnitude);
    if (accelerationWindow.current.length > 10) accelerationWindow.current.shift();

    if (accelerationWindow.current.length >= 5) {
      const recent = accelerationWindow.current.slice(-5);
      const spread = Math.max(...recent) - Math.min(...recent);
      const now = Date.now();
      if (spread > stepThreshold && now - lastStepTime.current > minStepInterval) {
        lastStepTime.current = now;
        onStepDetected();
      }
    }
  };

  const start = async () => {
    // Try Capacitor Motion (native builds — best accuracy)
    if (Capacitor.isNativePlatform()) {
      try {
        const { Motion } = await import("@capacitor/motion");
        listenerHandle.current = await Motion.addListener("accel", (event: any) => {
          const a = event?.accelerationIncludingGravity ?? event?.acceleration;
          if (!a) return;
          processSample(a.x ?? 0, a.y ?? 0, a.z ?? 0);
        });
        return;
      } catch (err) {
        console.warn("Capacitor Motion unavailable, falling back to DeviceMotion", err);
      }
    }

    // Browser fallback (iOS requires user permission gesture)
    if (!window.DeviceMotionEvent) return;
    try {
      if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
        const p = await (DeviceMotionEvent as any).requestPermission();
        if (p !== "granted") {
          toast({
            title: "Motion access denied",
            description: "Enable motion sensors in Safari settings to track steps.",
            variant: "destructive",
          });
          return;
        }
      }
    } catch (err) {
      // ignore — some browsers throw without gesture
    }
    window.addEventListener("devicemotion", handleBrowserMotion, false);
  };

  const stop = async () => {
    if (listenerHandle.current) {
      try {
        await listenerHandle.current.remove();
      } catch {}
      listenerHandle.current = null;
    }
    window.removeEventListener("devicemotion", handleBrowserMotion, false);
  };

  const handleBrowserMotion = (event: DeviceMotionEvent) => {
    const a = event.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null || a.z == null) return;
    processSample(a.x, a.y, a.z);
  };

  return null;
}
