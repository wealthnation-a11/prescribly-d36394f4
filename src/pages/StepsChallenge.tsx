import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Plus, Trophy, Footprints } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface StepLog {
  id: number;
  date: string;
  steps: number;
  completed: boolean;
}

interface Badge {
  id: string;
  badge_name: string;
  badge_description: string;
  earned_at: string;
}

export default function StepsChallenge() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [todaySteps, setTodaySteps] = useState(0);
  const [weeklyLogs, setWeeklyLogs] = useState<StepLog[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  const DAILY_GOAL = 5000;
  const progressPercentage = Math.min((todaySteps / DAILY_GOAL) * 100, 100);

  useEffect(() => {
    if (user) {
      fetchStepData();
      fetchBadges();
    }
  }, [user]);

  const fetchStepData = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      // Get today's steps
      const { data: todayLog, error: todayError } = await supabase
        .from('step_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (todayError && todayError.code !== 'PGRST116') {
        throw todayError;
      }

      if (todayLog) {
        setTodaySteps(todayLog.steps);
      } else {
        // Create today's log if it doesn't exist
        const { data: newLog, error: createError } = await supabase
          .from('step_logs')
          .insert({
            user_id: user.id,
            date: today,
            steps: 0,
            completed: false
          })
          .select()
          .single();

        if (createError) throw createError;
        setTodaySteps(0);
      }

      // Get weekly logs for streak display
      const { data: weekLogs, error: weekError } = await supabase
        .from('step_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weekAgoStr)
        .lte('date', today)
        .order('date', { ascending: true });

      if (weekError) throw weekError;

      setWeeklyLogs(weekLogs || []);
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

  const fetchBadges = async () => {
    if (!user) return;

    try {
      const { data: userBadges, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .eq('badge_name', 'Step Master');

      if (error) throw error;
      setBadges(userBadges || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  };

  const addSteps = async (stepCount: number) => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const newStepCount = todaySteps + stepCount;
      const isCompleted = newStepCount >= DAILY_GOAL;

      const { error } = await supabase
        .from('step_logs')
        .update({
          steps: newStepCount,
          completed: isCompleted
        })
        .eq('user_id', user.id)
        .eq('date', today);

      if (error) throw error;

      setTodaySteps(newStepCount);
      
      if (isCompleted && todaySteps < DAILY_GOAL) {
        toast({
          title: "Goal Achieved! 🎉",
          description: "You've reached your daily step goal!",
        });
      }

      // Refresh weekly data to update streak
      fetchStepData();
    } catch (error) {
      console.error('Error updating steps:', error);
      toast({
        title: "Error",
        description: "Failed to update steps",
        variant: "destructive",
      });
    }
  };

  const getStreakCount = () => {
    let streak = 0;
    const sortedLogs = [...weeklyLogs].reverse(); // Most recent first
    
    for (const log of sortedLogs) {
      if (log.completed) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <Footprints className="h-12 w-12 mx-auto mb-4 text-primary" />
          </div>
          <p className="text-muted-foreground">Loading your step progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background">
      <div className="container mx-auto px-4 py-6 max-w-md">
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
            <h1 className="text-2xl font-bold text-foreground">Step Challenge</h1>
            <p className="text-sm text-muted-foreground">Walk 5,000 steps daily</p>
          </div>
        </div>

        {/* Daily Progress Ring */}
        <Card className="mb-6 border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-48 h-48">
                <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted/20"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${progressPercentage * 2.51} 251`}
                    className="transition-all duration-300 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Footprints className="h-8 w-8 text-primary mb-2" />
                  <div className="text-3xl font-bold text-foreground">{todaySteps.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">/ {DAILY_GOAL.toLocaleString()}</div>
                  <div className="text-lg font-semibold text-primary mt-1">{Math.round(progressPercentage)}%</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 w-full">
                <Button
                  onClick={() => addSteps(100)}
                  className="bg-primary hover:bg-primary/90"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  100
                </Button>
                <Button
                  onClick={() => addSteps(500)}
                  className="bg-primary hover:bg-primary/90"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  500
                </Button>
                <Button
                  onClick={() => addSteps(1000)}
                  className="bg-primary hover:bg-primary/90"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  1K
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 7-Day Streak Tracker */}
        <Card className="mb-6 border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              7-Day Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current Streak</span>
                <span className="text-2xl font-bold text-primary">{getStreakCount()}/7</span>
              </div>
              
              <Progress value={(getStreakCount() / 7) * 100} className="h-3" />
              
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }, (_, index) => {
                  const dayLog = weeklyLogs[index];
                  const isCompleted = dayLog?.completed || false;
                  
                  return (
                    <div
                      key={index}
                      className={`aspect-square rounded-lg border-2 flex items-center justify-center text-xs transition-colors ${
                        isCompleted
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-muted border-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      <Footprints className="h-3 w-3" />
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges Section */}
        {badges.length > 0 && (
          <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Your Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {badges.map((badge) => (
                  <div key={badge.id} className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center">
                      <Trophy className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{badge.badge_name}</div>
                      <div className="text-sm text-muted-foreground">{badge.badge_description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {getStreakCount() === 7 && badges.length === 0 && (
          <Card className="border-amber-500/20 bg-amber-50 dark:bg-amber-950/10">
            <CardContent className="pt-6 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-amber-500" />
              <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-300 mb-2">
                Streak Complete!
              </h3>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Your Step Master badge will be awarded at midnight!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}