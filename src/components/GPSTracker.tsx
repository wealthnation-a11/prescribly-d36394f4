import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Square, MapPin, Timer, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GPSTrackerProps {
  onActivityComplete: () => void;
}

interface Position {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export default function GPSTracker({ onActivityComplete }: GPSTrackerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTracking, setIsTracking] = useState(false);
  const [route, setRoute] = useState<Position[]>([]);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [calories, setCalories] = useState(0);
  const watchId = useRef<number | null>(null);
  const startTime = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const calculateDistance = (pos1: Position, pos2: Position): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (pos2.latitude - pos1.latitude) * Math.PI / 180;
    const dLon = (pos2.longitude - pos1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(pos1.latitude * Math.PI / 180) * Math.cos(pos2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  };

  const calculateCalories = (distanceKm: number, durationMin: number): number => {
    // Rough calculation: walking burns ~50 calories per km
    return distanceKm * 50;
  };

  const startTracking = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS Not Available",
        description: "Your device doesn't support GPS tracking",
        variant: "destructive",
      });
      return;
    }

    setIsTracking(true);
    startTime.current = Date.now();
    setRoute([]);
    setDistance(0);
    setDuration(0);
    setCalories(0);

    // Start duration timer
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
      setDuration(elapsed);
    }, 1000);

    // Start GPS tracking
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPos: Position = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
        };

        setRoute(prev => {
          const newRoute = [...prev, newPos];
          
          // Calculate total distance
          if (newRoute.length > 1) {
            let totalDistance = 0;
            for (let i = 1; i < newRoute.length; i++) {
              totalDistance += calculateDistance(newRoute[i-1], newRoute[i]);
            }
            setDistance(totalDistance);
            setCalories(calculateCalories(totalDistance, duration / 60));
          }
          
          return newRoute;
        });
      },
      (error) => {
        console.error('GPS Error:', error);
        toast({
          title: "GPS Error",
          description: "Unable to get your location",
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    toast({
      title: "Walk Started! 🚶‍♂️",
      description: "Your GPS activity is now being tracked",
    });
  };

  const stopTracking = async () => {
    if (!user) return;

    setIsTracking(false);
    
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Save route to database
    try {
      const routeData = {
        type: "LineString",
        coordinates: route.map(pos => [pos.longitude, pos.latitude])
      };

      const { error } = await supabase
        .from('user_routes')
        .insert({
          user_id: user.id,
          route_data: routeData,
          total_distance_km: distance,
          duration_minutes: Math.floor(duration / 60),
          avg_pace_min_per_km: distance > 0 ? (duration / 60) / distance : 0,
          calories_burned: calories,
          steps_during_activity: Math.floor(distance * 1300), // Rough estimate: 1300 steps per km
          end_time: new Date().toISOString(),
          activity_type: 'walk'
        });

      if (error) throw error;

      toast({
        title: "Walk Completed! 🎉",
        description: `${distance.toFixed(2)}km in ${Math.floor(duration / 60)} minutes`,
      });

      onActivityComplete();
    } catch (error) {
      console.error('Error saving route:', error);
      toast({
        title: "Error",
        description: "Failed to save your walk data",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const averagePace = distance > 0 ? (duration / 60) / distance : 0;

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Tracking Button */}
          <div className="text-center">
            <Button
              onClick={isTracking ? stopTracking : startTracking}
              size="lg"
              className={`${
                isTracking 
                  ? "bg-red-500 hover:bg-red-600 text-white" 
                  : "bg-green-500 hover:bg-green-600 text-white"
              } rounded-full w-20 h-20 text-lg font-semibold`}
            >
              {isTracking ? <Square className="h-8 w-8" /> : <Play className="h-8 w-8" />}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              {isTracking ? "Stop Walk" : "Start Walk"}
            </p>
          </div>

          {/* Live Stats */}
          {isTracking && (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-primary/5">
                <Timer className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{formatTime(duration)}</div>
                <div className="text-xs text-muted-foreground">Duration</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-primary/5">
                <MapPin className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{distance.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Distance (km)</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-primary/5">
                <Zap className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{Math.round(calories)}</div>
                <div className="text-xs text-muted-foreground">Calories</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-primary/5">
                <div className="text-lg text-primary mx-auto mb-2">⚡</div>
                <div className="text-2xl font-bold text-foreground">{averagePace.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Pace (min/km)</div>
              </div>
            </div>
          )}

          {/* Simple Map Placeholder */}
          {isTracking && route.length > 0 && (
            <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Tracking {route.length} GPS points
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}