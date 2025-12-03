import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, AlertTriangle, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface SubscriptionCountdownTimerProps {
  expirationDate: string;
  daysRemaining: number;
  isActive: boolean;
  plan?: string;
}

export const SubscriptionCountdownTimer = ({ 
  expirationDate, 
  daysRemaining, 
  isActive,
  plan = 'monthly'
}: SubscriptionCountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('subscriptionTimerCollapsed');
    return saved === 'true';
  });
  const [isHidden, setIsHidden] = useState(() => {
    const saved = localStorage.getItem('subscriptionTimerHidden');
    return saved === 'true';
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expirationDate).getTime();
      const difference = expiry - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expirationDate]);

  const toggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem('subscriptionTimerCollapsed', String(newValue));
  };

  const toggleHidden = () => {
    const newValue = !isHidden;
    setIsHidden(newValue);
    localStorage.setItem('subscriptionTimerHidden', String(newValue));
  };

  const isExpiringSoon = daysRemaining <= 7;
  const isExpired = daysRemaining <= 0;
  const showSeconds = daysRemaining <= 7; // Only show seconds when expiring soon
  const isYearlyPlan = plan === 'yearly';

  // Calculate months remaining for yearly plans
  const monthsRemaining = Math.floor(daysRemaining / 30);

  // Format simplified display for yearly plans or when not expiring soon
  const getSimplifiedDisplay = () => {
    if (isYearlyPlan && monthsRemaining >= 1) {
      return `${monthsRemaining} month${monthsRemaining !== 1 ? 's' : ''} remaining`;
    }
    return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`;
  };

  if (!isActive || isExpired) {
    return (
      <Card className="border-2 border-destructive/20 bg-destructive/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <span className="font-medium text-destructive">
                  Subscription Expired
                </span>
                <p className="text-sm text-destructive/80">
                  Renew now to continue accessing premium features
                </p>
              </div>
            </div>
            <Button asChild variant="destructive" size="sm">
              <Link to="/subscription">Renew Now</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Hidden state - show minimal restore button
  if (isHidden) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleHidden}
        className="text-muted-foreground hover:text-foreground"
      >
        <Eye className="h-4 w-4 mr-2" />
        Show subscription timer
      </Button>
    );
  }

  return (
    <Card className={`border-2 transition-all duration-300 ${
      isExpiringSoon 
        ? 'border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20' 
        : 'border-primary/20 bg-primary/5'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Clock className={`h-5 w-5 ${isExpiringSoon ? 'text-orange-600' : 'text-primary'}`} />
            <span className={`font-medium ${isExpiringSoon ? 'text-orange-800 dark:text-orange-200' : 'text-foreground'}`}>
              {isExpiringSoon ? 'Subscription Expiring Soon!' : 'Active Subscription'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleHidden}
              title="Hide timer"
            >
              <EyeOff className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleCollapse}
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/subscription">Extend</Link>
            </Button>
          </div>
        </div>
        
        {/* Collapsed View - Simplified Display */}
        {isCollapsed ? (
          <div className={`text-center py-2 ${isExpiringSoon ? 'text-orange-700 dark:text-orange-300' : 'text-primary'}`}>
            <span className="text-lg font-semibold">{getSimplifiedDisplay()}</span>
          </div>
        ) : (
          <>
            {/* Expanded View - Full Countdown */}
            <div className={`grid ${showSeconds ? 'grid-cols-4' : 'grid-cols-3'} gap-2 text-center`}>
              <div className={`p-2 rounded-lg ${isExpiringSoon ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-primary/10'}`}>
                <div className={`text-lg font-bold ${isExpiringSoon ? 'text-orange-700 dark:text-orange-300' : 'text-primary'}`}>
                  {timeLeft.days}
                </div>
                <div className={`text-xs ${isExpiringSoon ? 'text-orange-600 dark:text-orange-400' : 'text-primary/70'}`}>
                  Days
                </div>
              </div>
              <div className={`p-2 rounded-lg ${isExpiringSoon ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-primary/10'}`}>
                <div className={`text-lg font-bold ${isExpiringSoon ? 'text-orange-700 dark:text-orange-300' : 'text-primary'}`}>
                  {timeLeft.hours}
                </div>
                <div className={`text-xs ${isExpiringSoon ? 'text-orange-600 dark:text-orange-400' : 'text-primary/70'}`}>
                  Hours
                </div>
              </div>
              <div className={`p-2 rounded-lg ${isExpiringSoon ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-primary/10'}`}>
                <div className={`text-lg font-bold ${isExpiringSoon ? 'text-orange-700 dark:text-orange-300' : 'text-primary'}`}>
                  {timeLeft.minutes}
                </div>
                <div className={`text-xs ${isExpiringSoon ? 'text-orange-600 dark:text-orange-400' : 'text-primary/70'}`}>
                  Minutes
                </div>
              </div>
              {showSeconds && (
                <div className={`p-2 rounded-lg ${isExpiringSoon ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-primary/10'}`}>
                  <div className={`text-lg font-bold ${isExpiringSoon ? 'text-orange-700 dark:text-orange-300' : 'text-primary'}`}>
                    {timeLeft.seconds}
                  </div>
                  <div className={`text-xs ${isExpiringSoon ? 'text-orange-600 dark:text-orange-400' : 'text-primary/70'}`}>
                    Seconds
                  </div>
                </div>
              )}
            </div>
            
            <p className={`text-xs mt-2 text-center ${isExpiringSoon ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
              Expires on {new Date(expirationDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
