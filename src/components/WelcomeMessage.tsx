import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface WelcomeMessageProps {
  onStartTour?: () => void;
  showTourButton?: boolean;
}

export const WelcomeMessage = ({ onStartTour, showTourButton = true }: WelcomeMessageProps) => {
  const { user, userProfile } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    // Check if user has seen welcome message in this session
    const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');
    if (hasSeenWelcome) {
      setIsVisible(false);
    }

    // Check if it's first visit
    const tourCompleted = userProfile?.dashboard_tour_completed;
    setIsFirstVisit(!tourCompleted);
  }, [userProfile]);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('hasSeenWelcome', 'true');
  };

  if (!isVisible || !user || !userProfile) return null;

  const firstName = userProfile.first_name || 'there';
  const lastLogin = userProfile.previous_login;
  const isReturningUser = lastLogin && !isFirstVisit;

  return (
    <Card 
      className={cn(
        "border-primary/20 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 animate-fade-in",
        "relative overflow-hidden"
      )}
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <CardContent className="p-6 relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="absolute top-2 right-2 h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {isFirstVisit ? (
                <>Welcome to Prescribly, {firstName}! 🎉</>
              ) : (
                <>Welcome back, {firstName}! 👋</>
              )}
            </h3>
            
            <p className="text-sm text-muted-foreground">
              {isFirstVisit ? (
                "We're excited to have you here! Let us show you around your dashboard."
              ) : isReturningUser ? (
                <>
                  Last login: <span className="font-medium">{formatDistanceToNow(new Date(lastLogin), { addSuffix: true })}</span>
                </>
              ) : (
                "Great to see you! Your health journey continues here."
              )}
            </p>

            {showTourButton && isFirstVisit && onStartTour && (
              <Button
                onClick={onStartTour}
                variant="default"
                size="sm"
                className="mt-3 gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Start Dashboard Tour
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
