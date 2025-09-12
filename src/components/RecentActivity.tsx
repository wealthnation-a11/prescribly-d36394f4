import React from 'react';
import { 
  Calendar, 
  MessageSquare, 
  Pill, 
  User, 
  Clock,
  Activity,
  Stethoscope,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { useRecentActivities, RecentActivity as RecentActivityType } from '@/hooks/useRecentActivities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

const getActivityIcon = (type: RecentActivityType['type']) => {
  switch (type) {
    case 'appointment':
      return Calendar;
    case 'prescription':
      return Pill;
    case 'chat':
      return MessageSquare;
    case 'profile_update':
      return User;
    case 'availability_update':
      return Clock;
    case 'diagnosis':
      return Stethoscope;
    case 'earnings':
      return DollarSign;
    default:
      return Activity;
  }
};

const getActivityColor = (type: RecentActivityType['type']) => {
  switch (type) {
    case 'appointment':
      return 'text-blue-500';
    case 'prescription':
      return 'text-green-500';
    case 'chat':
      return 'text-purple-500';
    case 'profile_update':
      return 'text-orange-500';
    case 'availability_update':
      return 'text-yellow-500';
    case 'diagnosis':
      return 'text-cyan-500';
    case 'earnings':
      return 'text-emerald-500';
    default:
      return 'text-gray-500';
  }
};

const ActivityItem = ({ activity }: { activity: RecentActivityType }) => {
  const Icon = getActivityIcon(activity.type);
  const iconColor = getActivityColor(activity.type);
  
  return (
    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={`flex-shrink-0 p-2 rounded-full bg-background ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {activity.details}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(activity.timestamp), 'dd/MM/yyyy, hh:mm a')}
        </p>
      </div>
    </div>
  );
};

const RecentActivity = () => {
  const { activities, loading, error } = useRecentActivities(10);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Failed to load recent activities
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No recent activity
            </p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-1">
              {activities.map((activity) => (
                <ActivityItem
                  key={activity.activity_id}
                  activity={activity}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;