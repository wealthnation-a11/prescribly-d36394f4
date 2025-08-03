import { Activity, Calendar, MessageCircle, FileUp, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useUserActivities } from "@/hooks/useUserActivities";
import { formatTimeAgo } from "@/utils/timeFormat";
import { Skeleton } from "@/components/ui/skeleton";

const getActivityIcon = (activityType: string) => {
  switch (activityType) {
    case 'appointment':
      return Calendar;
    case 'chat':
      return MessageCircle;
    case 'file_upload':
      return FileUp;
    case 'payment':
      return CreditCard;
    default:
      return Activity;
  }
};

const getActivityColor = (activityType: string) => {
  switch (activityType) {
    case 'appointment':
      return 'text-green-600';
    case 'chat':
      return 'text-purple-600';
    case 'file_upload':
      return 'text-blue-600';
    case 'payment':
      return 'text-orange-600';
    default:
      return 'text-muted-foreground';
  }
};

export const RecentActivity = () => {
  const { activities, loading, error } = useUserActivities(5);

  if (loading) {
    return (
      <Card className="dashboard-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="dashboard-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Activity className="w-12 h-12 text-destructive/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Activity</h3>
              <p className="text-content text-muted-foreground">
                Unable to load recent activities. Please try again later.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="dashboard-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Activity className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Recent Activity</h3>
              <p className="text-content text-muted-foreground">
                Start using our services to see your activity here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card">
      <CardContent className="p-6">
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.activity_type);
            const color = getActivityColor(activity.activity_type);
            
            return (
              <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:border-border transition-colors">
                <div className={`w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-content text-foreground font-medium truncate">
                    {activity.activity_description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(activity.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};