import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { 
  Brain, 
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Trophy,
  Flame,
  Star,
  CheckCircle2,
  Timer,
  Sparkles
} from "lucide-react";

interface MindfulnessLog {
  id: string;
  date: string;
  minutes: number;
  sessions: number;
  goal_reached: boolean;
}

const MindfulnessChallenge = () => {
  usePageSEO({
    title: "Mindfulness Challenge - Prescribly",
    description: "Practice daily meditation and mindfulness with the 7-day mindfulness challenge.",
    canonicalPath: "/health-challenges/mindfulness"
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [todayLog, setTodayLog] = useState<MindfulnessLog | null>(null);
  const [weeklyLogs, setWeeklyLogs] = useState<MindfulnessLog[]>([]);
  const [streak, setStreak] = useState(0);
  const [badgeEarned, setBadgeEarned] = useState(false);

  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(10); // minutes
  const targetSeconds = selectedDuration * 60;

  useEffect(() => {
    if (user?.id) {
      loadMindfulnessData();
    }
  }, [user?.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timerSeconds < targetSeconds) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerSeconds >= targetSeconds && timerActive) {
      setTimerActive(false);
      completeSession();
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds, targetSeconds]);

  const loadMindfulnessData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      // Fetch today's log
      const { data: todayData } = await supabase
        .from('user_mindfulness_log')
        .select('*')
        .eq('user_id', user!.id)
        .eq('date', today)
        .single();

      setTodayLog(todayData);

      // Fetch weekly logs
      const { data: weeklyData } = await supabase
        .from('user_mindfulness_log')
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', weekAgoStr)
        .order('date', { ascending: false });

      setWeeklyLogs(weeklyData || []);

      // Calculate streak
      const sortedLogs = (weeklyData || [])
        .filter(log => log.goal_reached)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let currentStreak = 0;
      for (let i = 0; i < sortedLogs.length; i++) {
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);
        const expectedStr = expectedDate.toISOString().split('T')[0];

        if (sortedLogs[i]?.date === expectedStr) {
          currentStreak++;
        } else {
          break;
        }
      }
      setStreak(currentStreak);

      // Check for badge
      const consecutiveDays = weeklyData?.filter(log => log.goal_reached).length || 0;
      setBadgeEarned(consecutiveDays >= 7);

    } catch (error) {
      console.error('Error loading mindfulness data:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeSession = async () => {
    if (!user?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const minutesCompleted = Math.floor(timerSeconds / 60);
      const newTotal = (todayLog?.minutes || 0) + minutesCompleted;
      const newSessions = (todayLog?.sessions || 0) + 1;
      const goalReached = newTotal >= 10;

      const { error } = await supabase
        .from('user_mindfulness_log')
        .upsert({
          user_id: user.id,
          date: today,
          minutes: newTotal,
          sessions: newSessions,
          goal_reached: goalReached
        }, {
          onConflict: 'user_id,date'
        });

      if (error) throw error;

      // Award points if goal reached for first time today
      if (goalReached && !todayLog?.goal_reached) {
        await supabase.rpc('update_user_points', {
          user_uuid: user.id,
          points_to_add: 20
        });
      }

      toast({
        title: "Session Complete! 🧘",
        description: goalReached 
          ? `You've reached your 10-minute goal! +20 points` 
          : `${minutesCompleted} minutes logged. ${10 - newTotal} more to goal!`
      });

      setTimerSeconds(0);
      loadMindfulnessData();
    } catch (error) {
      console.error('Error completing session:', error);
      toast({
        title: "Error",
        description: "Failed to save session",
        variant: "destructive"
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    setTimerActive(!timerActive);
  };

  const resetTimer = () => {
    setTimerActive(false);
    setTimerSeconds(0);
  };

  const progress = (timerSeconds / targetSeconds) * 100;
  const totalWeeklyMinutes = weeklyLogs.reduce((sum, log) => sum + log.minutes, 0);

  if (loading) {
    return (
      <div className="min-h-screen medical-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading mindfulness data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen medical-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="ghost" size="icon">
            <Link to="/health-challenges">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-purple-500/10 border border-purple-500/20">
                <Brain className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">7-Day Mindfulness Challenge</h1>
                <p className="text-muted-foreground">10 minutes of daily meditation</p>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            <Trophy className="w-3 h-3 mr-1" />
            20 pts/day
          </Badge>
        </div>

        {/* Badge Display */}
        {badgeEarned && (
          <Card className="glassmorphism-card border-0 mb-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Zen Master Badge</h3>
                  <p className="text-muted-foreground">Completed the 7-day challenge!</p>
                </div>
              </div>
              <Sparkles className="w-8 h-8 text-purple-500" />
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="glassmorphism-card border-0">
            <CardContent className="p-4 text-center">
              <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{streak}</div>
              <div className="text-xs text-muted-foreground">Day Streak</div>
            </CardContent>
          </Card>

          <Card className="glassmorphism-card border-0">
            <CardContent className="p-4 text-center">
              <Timer className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{todayLog?.minutes || 0}</div>
              <div className="text-xs text-muted-foreground">Min Today</div>
            </CardContent>
          </Card>

          <Card className="glassmorphism-card border-0">
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{totalWeeklyMinutes}</div>
              <div className="text-xs text-muted-foreground">Min This Week</div>
            </CardContent>
          </Card>
        </div>

        {/* Meditation Timer */}
        <Card className="glassmorphism-card border-0 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              Meditation Timer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Duration Selection */}
            <div className="flex justify-center gap-2">
              {[5, 10, 15, 20].map((mins) => (
                <Button
                  key={mins}
                  variant={selectedDuration === mins ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (!timerActive) {
                      setSelectedDuration(mins);
                      setTimerSeconds(0);
                    }
                  }}
                  disabled={timerActive}
                >
                  {mins} min
                </Button>
              ))}
            </div>

            {/* Timer Display */}
            <div className="relative w-48 h-48 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={553}
                  strokeDashoffset={553 - (553 * progress) / 100}
                  className="text-purple-500 transition-all duration-300"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-foreground">
                  {formatTime(timerSeconds)}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {formatTime(targetSeconds)}
                </span>
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={resetTimer}
                disabled={timerSeconds === 0}
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
              <Button
                size="lg"
                onClick={toggleTimer}
                className="w-32"
              >
                {timerActive ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    {timerSeconds > 0 ? 'Resume' : 'Start'}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={completeSession}
                disabled={timerSeconds < 60}
              >
                End Early
              </Button>
            </div>

            {/* Today's Progress */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Today's Goal</span>
                <span className="font-medium">{todayLog?.minutes || 0} / 10 minutes</span>
              </div>
              <Progress value={((todayLog?.minutes || 0) / 10) * 100} className="h-2" />
              {todayLog?.goal_reached && (
                <div className="flex items-center gap-2 text-green-600 mt-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">Goal reached! Great job!</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Progress */}
        <Card className="glassmorphism-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              7-Day Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-4">
              <span className="text-sm text-muted-foreground">Days completed</span>
              <span className="font-medium">
                {weeklyLogs.filter(l => l.goal_reached).length} / 7
              </span>
            </div>
            <Progress 
              value={(weeklyLogs.filter(l => l.goal_reached).length / 7) * 100} 
              className="h-3 mb-6" 
            />

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const dateStr = date.toISOString().split('T')[0];
                const log = weeklyLogs.find(l => l.date === dateStr);
                const dayName = date.toLocaleDateString('en', { weekday: 'short' });

                return (
                  <div key={i} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">{dayName}</div>
                    <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${
                      log?.goal_reached 
                        ? 'bg-green-500/20 text-green-600' 
                        : log 
                          ? 'bg-purple-500/20 text-purple-600' 
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {log?.goal_reached ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : log ? (
                        <Brain className="w-5 h-5" />
                      ) : (
                        <span className="text-xs">{date.getDate()}</span>
                      )}
                    </div>
                    {log && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {log.minutes}m
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MindfulnessChallenge;
