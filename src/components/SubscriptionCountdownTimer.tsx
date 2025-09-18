import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface SubscriptionCountdownTimerProps {
  expirationDate: string;
  daysRemaining: number;
  isActive: boolean;
}

export const SubscriptionCountdownTimer = ({ 
  expirationDate, 
  daysRemaining, 
  isActive 
}: SubscriptionCountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
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

  const isExpiringSoon = daysRemaining <= 7;
  const isExpired = daysRemaining <= 0;

  if (!isActive || isExpired) {
    return (
      <Card className="border-2 border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <span className="font-medium text-red-800">
                  Subscription Expired
                </span>
                <p className="text-sm text-red-600">
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

  return (
    <Card className={`border-2 ${isExpiringSoon ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Clock className={`h-5 w-5 ${isExpiringSoon ? 'text-orange-600' : 'text-blue-600'}`} />
            <span className={`font-medium ${isExpiringSoon ? 'text-orange-800' : 'text-blue-800'}`}>
              {isExpiringSoon ? 'Subscription Expiring Soon!' : 'Active Subscription'}
            </span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/subscription">Extend</Link>
          </Button>
        </div>
        
        {/* Countdown Display */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className={`p-2 rounded-lg ${isExpiringSoon ? 'bg-orange-100' : 'bg-blue-100'}`}>
            <div className={`text-lg font-bold ${isExpiringSoon ? 'text-orange-700' : 'text-blue-700'}`}>
              {timeLeft.days}
            </div>
            <div className={`text-xs ${isExpiringSoon ? 'text-orange-600' : 'text-blue-600'}`}>
              Days
            </div>
          </div>
          <div className={`p-2 rounded-lg ${isExpiringSoon ? 'bg-orange-100' : 'bg-blue-100'}`}>
            <div className={`text-lg font-bold ${isExpiringSoon ? 'text-orange-700' : 'text-blue-700'}`}>
              {timeLeft.hours}
            </div>
            <div className={`text-xs ${isExpiringSoon ? 'text-orange-600' : 'text-blue-600'}`}>
              Hours
            </div>
          </div>
          <div className={`p-2 rounded-lg ${isExpiringSoon ? 'bg-orange-100' : 'bg-blue-100'}`}>
            <div className={`text-lg font-bold ${isExpiringSoon ? 'text-orange-700' : 'text-blue-700'}`}>
              {timeLeft.minutes}
            </div>
            <div className={`text-xs ${isExpiringSoon ? 'text-orange-600' : 'text-blue-600'}`}>
              Minutes
            </div>
          </div>
          <div className={`p-2 rounded-lg ${isExpiringSoon ? 'bg-orange-100' : 'bg-blue-100'}`}>
            <div className={`text-lg font-bold ${isExpiringSoon ? 'text-orange-700' : 'text-blue-700'}`}>
              {timeLeft.seconds}
            </div>
            <div className={`text-xs ${isExpiringSoon ? 'text-orange-600' : 'text-blue-600'}`}>
              Seconds
            </div>
          </div>
        </div>
        
        <p className={`text-xs mt-2 text-center ${isExpiringSoon ? 'text-orange-600' : 'text-blue-600'}`}>
          Expires on {new Date(expirationDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </CardContent>
    </Card>
  );
};