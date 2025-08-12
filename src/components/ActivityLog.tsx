import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  MessageCircle, 
  User, 
  Clock, 
  CheckCircle, 
  DollarSign,
  Settings,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserActivity {
  id: string;
  activity_type: string;
  activity_description: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface ActivityLogProps {
  limit?: number;
  showTitle?: boolean;
  className?: string;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ 
  limit = 10, 
  showTitle = true,
  className = "" 
}) => {
  const { user } = useAuth();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['user-activities', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as UserActivity[];
    },
    enabled: !!user?.id,
  });

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'appointment_booked':
      case 'appointment_approved':
      case 'appointment_completed':
        return <Calendar className="w-4 h-4" />;
      case 'message_sent':
        return <MessageCircle className="w-4 h-4" />;
      case 'profile_updated':
        return <User className="w-4 h-4" />;
      case 'availability_updated':
        return <Clock className="w-4 h-4" />;
      case 'payment_processed':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'appointment_booked':
        return 'bg-blue-100 text-blue-800';
      case 'appointment_approved':
        return 'bg-teal-100 text-teal-800';
      case 'appointment_completed':
        return 'bg-green-100 text-green-800';
      case 'message_sent':
        return 'bg-purple-100 text-purple-800';
      case 'profile_updated':
        return 'bg-orange-100 text-orange-800';
      case 'availability_updated':
        return 'bg-yellow-100 text-yellow-800';
      case 'payment_processed':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                  <div className={`p-2 rounded-full ${getActivityColor(activity.activity_type)}`}>
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {activity.activity_description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {activity.activity_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityLog;