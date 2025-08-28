import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Activity, Map, Trophy, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import PedometerDisplay from "@/components/PedometerDisplay";
import GPSTracker from "@/components/GPSTracker";
import ActivityHistory from "@/components/ActivityHistory";
import AchievementDisplay from "@/components/AchievementDisplay";
import MotionSensor from "@/components/MotionSensor";

interface UserSteps {
  id: string;
  date: string;
  step_count: number;
  calories_burned: number;
  distance_km: number;
  goal_reached: boolean;
}

export default function StepsChallenge() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [todaySteps, setTodaySteps] = useState(0);
  const [todayData, setTodayData] = useState<UserSteps | null>(null);
  const [weeklyStreak, setWeeklyStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [motionActive, setMotionActive] = useState(false);

  const DAILY_GOAL = 5000;

  useEffect(() => {
    if (user) {
      fetchStepData();
    }
  }, [user]);

  const fetchStepData = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get or create today's step data
      const { data: todayLog, error: todayError } = await supabase
        .from('user_steps')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (todayError && todayError.code !== 'PGRST116') {
        throw todayError;
      }

      if (todayLog) {
        setTodayData(todayLog);
        setTodaySteps(todayLog.step_count);
      } else {
        // Create today's log if it doesn't exist
        const { data: newLog, error: createError } = await supabase
          .from('user_steps')
          .insert({
            user_id: user.id,
            date: today,
            step_count: 0,
            calories_burned: 0,
            distance_km: 0,
            goal_reached: false
          })
          .select()
          .single();

        if (createError) throw createError;
        setTodayData(newLog);
        setTodaySteps(0);
      }

      // Calculate current streak
      await calculateStreak();
    } catch (error) {
      console.error('Error fetching step data:', error);
      toast({
        title: "Error",
        description: "Failed to load step data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = async () => {
    if (!user) return;

    try {
      const { data: steps, error } = await supabase
        .from('user_steps')
        .select('date, goal_reached')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      let streak = 0;
      for (const step of steps || []) {
        if (step.goal_reached) {
          streak++;
        } else {
          break;
        }
      }
      setWeeklyStreak(streak);
    } catch (error) {
      console.error('Error calculating streak:', error);
    }
  };

  const handleStepDetected = async () => {
    const newStepCount = todaySteps + 1;
    await updateStepCount(newStepCount);
  };

  const updateStepCount = async (stepCount: number) => {
    if (!user || !todayData) return;

    try {
      const goalReached = stepCount >= DAILY_GOAL;
      const distance = stepCount * 0.0008; // Rough conversion: 1 step ≈ 0.8m
      const calories = stepCount * 0.04; // Rough conversion: 1 step ≈ 0.04 calories

      const { error } = await supabase
        .from('user_steps')
        .update({
          step_count: stepCount,
          calories_burned: calories,
          distance_km: distance,
          goal_reached: goalReached
        })
        .eq('id', todayData.id);

      if (error) throw error;

      setTodaySteps(stepCount);
      setTodayData(prev => prev ? {
        ...prev,
        step_count: stepCount,
        calories_burned: calories,
        distance_km: distance,
        goal_reached: goalReached
      } : null);

      // Check for goal achievement
      if (goalReached && todaySteps < DAILY_GOAL) {
        toast({
          title: "Goal Achieved! 🎉",
          description: "You've reached your daily step goal!",
        });

        // Award achievements
        await supabase.rpc('check_and_award_step_achievements', {
          user_uuid: user.id
        });
      }

      // Recalculate streak
      await calculateStreak();
    } catch (error) {
      console.error('Error updating steps:', error);
      toast({
        title: "Error",
        description: "Failed to update steps",
        variant: "destructive",
      });
    }
  };

  const handleActivityComplete = () => {
    fetchStepData(); // Refresh data after GPS activity
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <Activity className="h-12 w-12 mx-auto mb-4 text-primary" />
          </div>
          <p className="text-muted-foreground">Loading your activity tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/health-challenges")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Walk 5,000 Steps Daily</h1>
            <p className="text-sm text-muted-foreground">Pedometer + GPS Activity Tracker</p>
          </div>
        </div>

        {/* Motion Sensor Integration */}
        <MotionSensor 
          onStepDetected={handleStepDetected}
          isActive={motionActive}
        />

        {/* Tabs for different features */}
        <Tabs defaultValue="pedometer" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="pedometer" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Steps</span>
            </TabsTrigger>
            <TabsTrigger value="gps" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">GPS</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Awards</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          {/* Pedometer Tab */}
          <TabsContent value="pedometer" className="space-y-6">
            <PedometerDisplay
              steps={todaySteps}
              goal={DAILY_GOAL}
              calories={todayData?.calories_burned || 0}
              distance={todayData?.distance_km || 0}
            />

            {/* Motion Detection Toggle */}
            <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">Auto Step Detection</h3>
                    <p className="text-sm text-muted-foreground">Use motion sensors to track steps automatically</p>
                  </div>
                  <Button
                    onClick={() => setMotionActive(!motionActive)}
                    variant={motionActive ? "default" : "outline"}
                    size="sm"
                  >
                    {motionActive ? "ON" : "OFF"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Add Steps */}
            <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Manual Step Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => updateStepCount(todaySteps + 100)}
                    variant="outline"
                    className="h-16"
                  >
                    <div className="text-center">
                      <div className="text-lg font-bold">+100</div>
                      <div className="text-xs">Steps</div>
                    </div>
                  </Button>
                  <Button
                    onClick={() => updateStepCount(todaySteps + 500)}
                    variant="outline"
                    className="h-16"
                  >
                    <div className="text-center">
                      <div className="text-lg font-bold">+500</div>
                      <div className="text-xs">Steps</div>
                    </div>
                  </Button>
                  <Button
                    onClick={() => updateStepCount(todaySteps + 1000)}
                    variant="outline"
                    className="h-16"
                  >
                    <div className="text-center">
                      <div className="text-lg font-bold">+1K</div>
                      <div className="text-xs">Steps</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GPS Tracking Tab */}
          <TabsContent value="gps" className="space-y-6">
            <GPSTracker onActivityComplete={handleActivityComplete} />
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <AchievementDisplay 
              currentStreak={weeklyStreak}
              todayGoalReached={todayData?.goal_reached || false}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <ActivityHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}