import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Check, Smartphone, Zap, WifiOff, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    setIsInstalled(standalone);

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt && !isIOS) {
      toast({
        title: "Already Available",
        description: "The app is already installable from your browser.",
        variant: "default",
      });
      return;
    }

    if (isIOS) {
      // iOS users need manual instructions
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        toast({
          title: "Successfully Installed!",
          description: "Prescribly has been added to your device.",
        });
      }
      
      setDeferredPrompt(null);
    }
  };

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Native app-like performance with instant loading"
    },
    {
      icon: WifiOff,
      title: "Offline Access",
      description: "Access key features even without internet connection"
    },
    {
      icon: Smartphone,
      title: "Full Screen Experience",
      description: "Immersive interface without browser bars"
    },
    {
      icon: Check,
      title: "Auto Updates",
      description: "Always stay up-to-date with the latest features"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-6">
            <img 
              src="/pwa-icon.png" 
              alt="Prescribly" 
              className="w-24 h-24 rounded-2xl shadow-lg"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Install Prescribly
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Get the full app experience with faster loading, offline access, and easy access from your home screen.
          </p>
        </div>

        {/* Installation Card */}
        <Card className="mb-8 border-primary/20">
          <CardHeader>
            <CardTitle>
              {isInstalled ? "Already Installed! 🎉" : "Quick Installation"}
            </CardTitle>
            <CardDescription>
              {isInstalled 
                ? "You can access Prescribly from your home screen anytime."
                : isIOS
                ? "Follow these simple steps to install on iOS"
                : "Click the button below to install Prescribly on your device"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isInstalled ? (
              <Button onClick={() => navigate("/dashboard")} className="w-full" size="lg">
                Go to Dashboard
              </Button>
            ) : isIOS ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Tap the Share button</p>
                    <p className="text-sm text-muted-foreground">
                      Look for <Share2 className="inline w-4 h-4 mx-1" /> in Safari's toolbar
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Select "Add to Home Screen"</p>
                    <p className="text-sm text-muted-foreground">
                      Scroll down in the share menu to find this option
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Tap "Add"</p>
                    <p className="text-sm text-muted-foreground">
                      Prescribly will appear on your home screen
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Button 
                onClick={handleInstall} 
                className="w-full" 
                size="lg"
                disabled={!deferredPrompt}
              >
                <Download className="w-5 h-5 mr-2" />
                {deferredPrompt ? "Install Now" : "Not Available Yet"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          {features.map((feature) => (
            <Card key={feature.title} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Installing the app is optional. You can continue using Prescribly in your browser.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Continue in Browser
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;
