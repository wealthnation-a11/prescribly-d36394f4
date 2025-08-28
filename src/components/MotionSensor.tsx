import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface MotionSensorProps {
  onStepDetected: () => void;
  isActive: boolean;
}

export default function MotionSensor({ onStepDetected, isActive }: MotionSensorProps) {
  const { toast } = useToast();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const lastStepTime = useRef(0);
  const accelerationData = useRef<number[]>([]);
  const stepThreshold = 12; // Acceleration threshold for step detection
  const minStepInterval = 300; // Minimum time between steps (ms)

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    if (isActive && permissionGranted) {
      startMotionDetection();
    } else {
      stopMotionDetection();
    }

    return () => stopMotionDetection();
  }, [isActive, permissionGranted]);

  const requestPermissions = async () => {
    // Check if device motion is supported
    if (!window.DeviceMotionEvent) {
      console.log('Device motion not supported');
      return;
    }

    try {
      // For iOS 13+ we need to request permission
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') {
          setPermissionGranted(true);
        } else {
          toast({
            title: "Motion Permission Denied",
            description: "Enable motion sensors for automatic step counting",
            variant: "destructive",
          });
        }
      } else {
        // For other browsers, assume permission is granted
        setPermissionGranted(true);
      }
    } catch (error) {
      console.error('Error requesting motion permission:', error);
      setPermissionGranted(true); // Fallback to assuming permission
    }
  };

  const startMotionDetection = () => {
    if (!permissionGranted) return;

    window.addEventListener('devicemotion', handleMotion, false);
  };

  const stopMotionDetection = () => {
    window.removeEventListener('devicemotion', handleMotion, false);
  };

  const handleMotion = (event: DeviceMotionEvent) => {
    if (!event.accelerationIncludingGravity) return;

    const { x, y, z } = event.accelerationIncludingGravity;
    if (x === null || y === null || z === null) return;

    // Calculate total acceleration magnitude
    const acceleration = Math.sqrt(x * x + y * y + z * z);
    
    // Add to moving window
    accelerationData.current.push(acceleration);
    if (accelerationData.current.length > 10) {
      accelerationData.current.shift();
    }

    // Check for step pattern (significant acceleration spike)
    if (accelerationData.current.length >= 5) {
      const recent = accelerationData.current.slice(-5);
      const max = Math.max(...recent);
      const min = Math.min(...recent);
      const difference = max - min;

      const now = Date.now();
      if (
        difference > stepThreshold && 
        now - lastStepTime.current > minStepInterval
      ) {
        lastStepTime.current = now;
        onStepDetected();
      }
    }
  };

  // This component doesn't render anything visible
  return null;
}