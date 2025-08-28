import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Timer, Zap, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RouteData {
  id: string;
  total_distance_km: number;
  duration_minutes: number;
  avg_pace_min_per_km: number;
  calories_burned: number;
  start_time: string;
  activity_type: string;
}

export default function ActivityHistory() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRoutes();
    }
  }, [user]);

  const fetchRoutes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_routes')
        .select('id, total_distance_km, duration_minutes, avg_pace_min_per_km, calories_burned, start_time, activity_type')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Activity History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading activities...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Activity History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {routes.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No walk activities yet</p>
            <p className="text-sm text-muted-foreground mt-2">Start your first GPS tracked walk!</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className="p-4 rounded-lg border border-primary/10 bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium text-foreground capitalize">
                      {route.activity_type} Activity
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(route.start_time)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div>
                      <MapPin className="h-4 w-4 text-primary mx-auto mb-1" />
                      <div className="text-sm font-semibold text-foreground">
                        {route.total_distance_km.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">km</div>
                    </div>
                    <div>
                      <Timer className="h-4 w-4 text-primary mx-auto mb-1" />
                      <div className="text-sm font-semibold text-foreground">
                        {route.duration_minutes}
                      </div>
                      <div className="text-xs text-muted-foreground">min</div>
                    </div>
                    <div>
                      <div className="text-primary mx-auto mb-1 text-sm">⚡</div>
                      <div className="text-sm font-semibold text-foreground">
                        {route.avg_pace_min_per_km?.toFixed(1) || '0.0'}
                      </div>
                      <div className="text-xs text-muted-foreground">pace</div>
                    </div>
                    <div>
                      <Zap className="h-4 w-4 text-primary mx-auto mb-1" />
                      <div className="text-sm font-semibold text-foreground">
                        {Math.round(route.calories_burned || 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">cal</div>
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
}