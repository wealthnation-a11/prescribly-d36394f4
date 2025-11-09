import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showAlert) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-md animate-in slide-in-from-top-5">
      <Alert 
        variant={isOnline ? "default" : "destructive"}
        className={isOnline ? "border-success-green/50 bg-success-green/10" : ""}
      >
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-success-green" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <AlertDescription className="font-medium">
            {isOnline 
              ? "You're back online!" 
              : "You're offline. Some features may be limited."}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
};
