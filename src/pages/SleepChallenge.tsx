import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { 
  Moon, 
  Sun, 
  ArrowLeft,
  Clock,
  Star,
  Trophy,
  Flame,
  Bed,
  Sunrise,
  CheckCircle2,
  TrendingUp
} from "lucide-react";

interface SleepLog {
  id: string;
  date: string;
  bedtime: string;
  wake_time: string;
  sleep_hours: number;
  sleep_quality: number;
  goal_reached: boolean;
}

const SleepChallenge = () => {
  usePageSEO({
    title: "Sleep Challenge - Prescribly",
    description: "Track your sleep patterns and improve your rest quality with the 7-day sleep challenge.",
    canonicalPath: "/health-challenges/sleep"
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [todaySleep, setTodaySleep] = useState<SleepLog | null>(null);
  const [weeklyLogs, setWeeklyLogs] = useState<SleepLog[]>([]);
  const [streak, setStreak] = useState(0);
  const [bedtime, setBedtime] = useState("22:00");
  const [wakeTime, setWakeTime] = useState("06:00");
  const [sleepQuality, setSleepQuality] = useState([3]);
  const [badgeEarned, setBadgeEarned] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSleepData();
    }
  }, [user?.id]);

  const loadSleepData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      // Fetch today's log using raw query since table is new
      const { data: todayData } = await supabase
        .from('user_sleep_log' as any)
        .select('*')
        .eq('user_id', user!.id)
        .eq('date', today)
        .single();

      if (todayData) {
        setTodaySleep(todayData as unknown as SleepLog);
      }

      // Fetch weekly logs
      const { data: weeklyData } = await supabase
        .from('user_sleep_log' as any)
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', weekAgoStr)
        .order('date', { ascending: false });

      const logs = (weeklyData || []) as unknown as SleepLog[];
      setWeeklyLogs(logs);

      // Calculate streak
      const sortedLogs = logs
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
      const consecutiveDays = logs.filter(log => log.goal_reached).length || 0;
      setBadgeEarned(consecutiveDays >= 7);

    } catch (error) {
      console.error('Error loading sleep data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSleepHours = (bed: string, wake: string): number => {
    const [bedH, bedM] = bed.split(':').map(Number);
    const [wakeH, wakeM] = wake.split(':').map(Number);
    
    let bedMinutes = bedH * 60 + bedM;
    let wakeMinutes = wakeH * 60 + wakeM;
    
    // If wake time is earlier than bed time, add 24 hours worth of minutes
    if (wakeMinutes <= bedMinutes) {
      wakeMinutes += 24 * 60;
    }
    
    return (wakeMinutes - bedMinutes) / 60;
  };

  const logSleep = async () => {
    if (!user?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const sleepHours = calculateSleepHours(bedtime, wakeTime);
      const goalReached = sleepHours >= 7 && sleepHours <= 9;

      const { error } = await supabase
        .from('user_sleep_log' as any)
        .upsert({
          user_id: user.id,
          date: today,
          bedtime,
          wake_time: wakeTime,
          sleep_hours: sleepHours,
          sleep_quality: sleepQuality[0],
          goal_reached: goalReached
        }, {
          onConflict: 'user_id,date'
        });

      if (error) throw error;

      // Award points if goal reached
      if (goalReached) {
        await supabase.rpc('update_user_points', {
          user_uuid: user.id,
          points_to_add: 15
        });
      }

      toast({
        title: goalReached ? "Great sleep! 🌙" : "Sleep logged",
        description: goalReached 
          ? `${sleepHours.toFixed(1)} hours of quality rest! +15 points` 
          : `${sleepHours.toFixed(1)} hours logged. Aim for 7-9 hours!`
      });

      loadSleepData();
    } catch (error) {
      console.error('Error logging sleep:', error);
      toast({
        title: "Error",
        description: "Failed to log sleep data",
        variant: "destructive"
      });
    }
  };

  const getQualityLabel = (value: number) => {
    const labels = ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'];
    return labels[value - 1] || 'Fair';
  };

  const getQualityColor = (value: number) => {
    const colors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500', 'text-emerald-500'];
    return colors[value - 1] || 'text-yellow-500';
  };

  const averageSleep = weeklyLogs.length > 0
    ? weeklyLogs.reduce((sum, log) => sum + log.sleep_hours, 0) / weeklyLogs.length
    : 0;

  const averageQuality = weeklyLogs.length > 0
    ? weeklyLogs.reduce((sum, log) => sum + log.sleep_quality, 0) / weeklyLogs.length
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen medical-background flex items-center justify-center">
        <div className="text-center">
          <Moon className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading sleep data...</p>
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
              <div className="p-3 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                <Moon className="h-6 w-6 text-indigo-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">7-Day Sleep Challenge</h1>
                <p className="text-muted-foreground">Get 7-9 hours of quality sleep</p>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            <Trophy className="w-3 h-3 mr-1" />
            15 pts/day
          </Badge>
        </div>

        {/* Badge Display */}
        {badgeEarned && (
          <Card className="glassmorphism-card border-0 mb-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <Moon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Sleep Master Badge</h3>
                  <p className="text-muted-foreground">Completed the 7-day challenge!</p>
                </div>
              </div>
              <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
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
              <Clock className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{averageSleep.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Avg Hours</div>
            </CardContent>
          </Card>

          <Card className="glassmorphism-card border-0">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <div className={`text-2xl font-bold ${getQualityColor(Math.round(averageQuality))}`}>
                {getQualityLabel(Math.round(averageQuality))}
              </div>
              <div className="text-xs text-muted-foreground">Avg Quality</div>
            </CardContent>
          </Card>
        </div>

        {/* Log Sleep Form */}
        <Card className="glassmorphism-card border-0 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bed className="w-5 h-5 text-indigo-500" />
              Log Today's Sleep
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedtime" className="flex items-center gap-2">
                  <Moon className="w-4 h-4" /> Bedtime
                </Label>
                <Input
                  id="bedtime"
                  type="time"
                  value={bedtime}
                  onChange={(e) => setBedtime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waketime" className="flex items-center gap-2">
                  <Sunrise className="w-4 h-4" /> Wake Time
                </Label>
                <Input
                  id="waketime"
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Star className="w-4 h-4" /> Sleep Quality
                </span>
                <span className={`font-medium ${getQualityColor(sleepQuality[0])}`}>
                  {getQualityLabel(sleepQuality[0])}
                </span>
              </Label>
              <Slider
                value={sleepQuality}
                onValueChange={setSleepQuality}
                min={1}
                max={5}
                step={1}
                className="mt-2"
              />
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Calculated sleep time:</span>
                <span className="font-bold text-lg">
                  {calculateSleepHours(bedtime, wakeTime).toFixed(1)} hours
                </span>
              </div>
              {calculateSleepHours(bedtime, wakeTime) >= 7 && calculateSleepHours(bedtime, wakeTime) <= 9 && (
                <div className="flex items-center gap-2 text-green-600 mt-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">Perfect! You'll meet your goal</span>
                </div>
              )}
            </div>

            <Button 
              onClick={logSleep} 
              className="w-full"
              disabled={!!todaySleep}
            >
              {todaySleep ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Already Logged Today
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 mr-2" />
                  Log Sleep
                </>
              )}
            </Button>
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
                          ? 'bg-orange-500/20 text-orange-600' 
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {log?.goal_reached ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : log ? (
                        <Moon className="w-5 h-5" />
                      ) : (
                        <span className="text-xs">{date.getDate()}</span>
                      )}
                    </div>
                    {log && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {log.sleep_hours.toFixed(1)}h
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

export default SleepChallenge;