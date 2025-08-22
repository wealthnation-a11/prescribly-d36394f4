import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePageSEO } from '@/hooks/usePageSEO';
import { 
  Droplets,
  Award,
  Calendar,
  ArrowLeft,
  Plus,
  Target,
  Flame
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HydrationLog {
  id: string;
  date: string;
  glasses_drank: number;
}

const HydrationChallenge = () => {
  usePageSEO({
    title: "7-Day Hydration Challenge - Prescribly",
    description: "Track your daily water intake with our 7-day hydration challenge. Monitor progress and earn badges.",
    canonicalPath: "/health-challenges/hydration"
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const [todayGlasses, setTodayGlasses] = useState(0);
  const [weeklyLogs, setWeeklyLogs] = useState<HydrationLog[]>([]);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [badgeEarned, setBadgeEarned] = useState(false);

  const DAILY_GOAL = 8; // 8 glasses per day

  useEffect(() => {
    loadHydrationData();
  }, []);

  const loadHydrationData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get last 7 days of data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('user_hydration_log')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      const logs = data || [];
      setWeeklyLogs(logs);

      // Set today's glasses
      const today = new Date().toISOString().split('T')[0];
      const todayLog = logs.find(log => log.date === today);
      setTodayGlasses(todayLog?.glasses_drank || 0);

      // Calculate streak (consecutive days with 8+ glasses)
      calculateStreak(logs);
      
      // Check if badge earned (7 consecutive days)
      const consecutiveDays = calculateConsecutiveDays(logs);
      setBadgeEarned(consecutiveDays >= 7);
      
    } catch (error: any) {
      console.error('Error loading hydration data:', error);
      toast({
        title: "Error",
        description: "Failed to load hydration data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStreak = (logs: HydrationLog[]) => {
    let currentStreak = 0;
    const sortedLogs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (let i = 0; i < sortedLogs.length; i++) {
      if (sortedLogs[i].glasses_drank >= DAILY_GOAL) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    setStreak(currentStreak);
  };

  const calculateConsecutiveDays = (logs: HydrationLog[]) => {
    let consecutive = 0;
    const sortedLogs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (let i = 0; i < Math.min(sortedLogs.length, 7); i++) {
      if (sortedLogs[i].glasses_drank >= DAILY_GOAL) {
        consecutive++;
      } else {
        break;
      }
    }
    
    return consecutive;
  };

  const logGlass = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to track your hydration.",
          variant: "destructive"
        });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const newGlassCount = todayGlasses + 1;

      const { error } = await supabase
        .from('user_hydration_log')
        .upsert({
          user_id: user.id,
          date: today,
          glasses_drank: newGlassCount
        }, {
          onConflict: 'user_id,date'
        });

      if (error) throw error;

      setTodayGlasses(newGlassCount);
      
      // Update user points
      await supabase.rpc('update_user_points', {
        user_uuid: user.id,
        points_to_add: 10
      });

      toast({
        title: "Great job! 💧",
        description: `Glass ${newGlassCount} logged! +10 points earned.`
      });

      // Reload data to update streak
      loadHydrationData();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to log glass. Please try again.",
        variant: "destructive"
      });
    }
  };

  const progressPercentage = (todayGlasses / DAILY_GOAL) * 100;
  const streakPercentage = (streak / 7) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen medical-background flex items-center justify-center">
        <div className="text-center">
          <Droplets className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading hydration data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen medical-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/health-challenges')}
            className="mb-4 text-primary hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Challenges
          </Button>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-blue-100 border border-blue-200">
                <Droplets className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-primary">7-Day Hydration Challenge</h1>
                <p className="text-lg text-blue-600 font-medium">Stay Hydrated, Stay Healthy</p>
              </div>
            </div>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Track your daily water intake and build a healthy hydration habit. Aim for 8 glasses per day!
            </p>
          </div>
        </div>

        {/* Badge Display */}
        {badgeEarned && (
          <div className="max-w-2xl mx-auto mb-8">
            <Card className="glassmorphism-card border-0 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200">
              <CardContent className="p-6 text-center">
                <Award className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-primary mb-2">Hydration Hero Badge Earned! 🏆</h3>
                <p className="text-blue-700">Congratulations! You've completed the 7-day hydration challenge.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Daily Water Tracker */}
        <div className="max-w-2xl mx-auto mb-8">
          <Card className="glassmorphism-card border-0 border border-blue-100">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl text-primary flex items-center justify-center gap-2">
                <Target className="h-6 w-6 text-blue-500" />
                Today's Hydration
              </CardTitle>
              <p className="text-muted-foreground">Track your daily water intake</p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Circular Progress */}
              <div className="relative flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="rgba(59, 130, 246, 0.1)"
                      strokeWidth="8"
                      fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="rgb(59, 130, 246)"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${progressPercentage * 2.51} 251.2`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Droplets className="h-8 w-8 text-blue-500 mb-2" />
                    <span className="text-3xl font-bold text-primary">{todayGlasses}</span>
                    <span className="text-lg text-muted-foreground">/ {DAILY_GOAL}</span>
                    <span className="text-sm text-blue-600 font-medium">glasses</span>
                  </div>
                </div>
              </div>

              {/* Log Glass Button */}
              <div className="text-center">
                <Button 
                  onClick={logGlass}
                  disabled={todayGlasses >= DAILY_GOAL}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 text-lg rounded-full"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  {todayGlasses >= DAILY_GOAL ? "Daily Goal Reached!" : "Log a Glass"}
                </Button>
                
                {todayGlasses >= DAILY_GOAL && (
                  <p className="text-green-600 mt-2 font-medium">
                    🎉 Amazing! You've reached your daily hydration goal!
                  </p>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Daily Progress</span>
                  <span className="font-medium text-blue-600">{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-3 bg-blue-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 7-Day Streak Tracker */}
        <div className="max-w-2xl mx-auto mb-8">
          <Card className="glassmorphism-card border-0 border border-blue-100">
            <CardHeader>
              <CardTitle className="text-xl text-primary flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Weekly Streak Progress
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-primary">{streak} Day Streak</span>
                <Badge variant={streak >= 7 ? "default" : "secondary"} className="bg-blue-100 text-blue-800">
                  {streak}/7 Days
                </Badge>
              </div>
              
              <Progress value={streakPercentage} className="h-3 bg-blue-50" />
              
              <p className="text-sm text-muted-foreground">
                {streak >= 7 
                  ? "🎉 Congratulations! You've completed the 7-day challenge!" 
                  : `Keep going! ${7 - streak} more days to complete the challenge.`
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Overview */}
        <div className="max-w-2xl mx-auto">
          <Card className="glassmorphism-card border-0 border border-blue-100">
            <CardHeader>
              <CardTitle className="text-xl text-primary flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                This Week's Progress
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - i));
                  const dateString = date.toISOString().split('T')[0];
                  const dayLog = weeklyLogs.find(log => log.date === dateString);
                  const glasses = dayLog?.glasses_drank || 0;
                  const goalMet = glasses >= DAILY_GOAL;
                  
                  return (
                    <div key={i} className="text-center p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <div className="text-xs text-muted-foreground mb-1">
                        {date.toLocaleDateString('en', { weekday: 'short' })}
                      </div>
                      <div className={`text-lg font-bold ${goalMet ? 'text-blue-600' : 'text-gray-400'}`}>
                        {glasses}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {goalMet ? '✓' : `/${DAILY_GOAL}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HydrationChallenge;