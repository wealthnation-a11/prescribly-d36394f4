import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const NotificationSettings = () => {
  const { isSubscribed, permission, requestPermission, unsubscribe } = usePushNotifications();

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await requestPermission();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive appointment reminders and health tips
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications">Enable Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Get notified about appointments and health updates
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggleNotifications}
            disabled={permission === 'denied'}
          />
        </div>

        {permission === 'denied' && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <BellOff className="inline h-4 w-4 mr-2" />
            Notifications are blocked. Please enable them in your browser settings.
          </div>
        )}

        {permission === 'default' && (
          <Button 
            onClick={requestPermission}
            variant="outline"
            className="w-full"
          >
            <Bell className="h-4 w-4 mr-2" />
            Enable Push Notifications
          </Button>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>You'll receive notifications for:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Upcoming appointment reminders (1 hour before)</li>
            <li>Appointment status updates</li>
            <li>Daily health tips and wellness advice</li>
            <li>Prescription updates</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
