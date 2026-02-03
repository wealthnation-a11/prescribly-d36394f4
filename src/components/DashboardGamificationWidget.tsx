import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { 
  Trophy, 
  Flame, 
  Star, 
  Target,
  TrendingUp,
  Droplets,
  Footprints,
  ChevronRight,
  Zap
} from "lucide-react";

interface GamificationStats {
  totalPoints: number;
  level: number;
  levelName: string;
  pointsToNextLevel: number;
  currentLevelPoints: number;
  currentStreak: number;
  todayGoals: {
    steps: { current: number; goal: number; completed: boolean };
    hydration: { current: number; goal: number; completed: boolean };
  };
  recentBadge: { name: string; icon: string } | null;
  activeChallenges: number;
}

const LEVELS = [
  { name: "Beginner", minPoints: 0, maxPoints: 100 },
  { name: "Health Rookie", minPoints: 101, maxPoints: 500 },
  { name: "Wellness Warrior", minPoints: 501, maxPoints: 1000 },
  { name: "Health Champion", minPoints: 1001, maxPoints: 2500 },
  { name: "Wellness Master", minPoints: 2501, maxPoints: 5000 },
  { name: "Health Legend", minPoints: 5001, maxPoints: Infinity },
];

const getLevelInfo = (points: number) => {
  for (let i = 0; i < LEVELS.length; i++) {
    if (points <= LEVELS[i].maxPoints) {
      const level = i + 1;
      const levelName = LEVELS[i].name;
      const currentLevelPoints = points - (i > 0 ? LEVELS[i - 1].maxPoints : 0);
      const pointsInLevel = LEVELS[i].maxPoints - (i > 0 ? LEVELS[i - 1].maxPoints : 0);
      const pointsToNextLevel = LEVELS[i].maxPoints - points;
      return { level, levelName, currentLevelPoints, pointsInLevel, pointsToNextLevel };
    }
  }
  return { level: 6, levelName: "Health Legend", currentLevelPoints: 0, pointsInLevel: 1, pointsToNextLevel: 0 };
};

export const DashboardGamificationWidget = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchGamificationStats();
    }
  }, [user?.id]);

  const fetchGamificationStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch user points
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', user!.id)
        .single();

      const totalPoints = pointsData?.points || 0;
      const levelInfo = getLevelInfo(totalPoints);

      // Fetch today's steps
      const { data: stepsData } = await supabase
        .from('user_steps')
        .select('step_count, goal_reached')
        .eq('user_id', user!.id)
        .eq('date', today)
        .single();

      // Fetch today's hydration
      const { data: hydrationData } = await supabase
        .from('user_hydration_log')
        .select('glasses_drank')
        .eq('user_id', user!.id)
        .eq('date', today)
        .single();

      // Fetch active challenges count
      const { count: activeChallenges } = await supabase
        .from('user_challenges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('status', 'active');

      // Fetch recent badge
      const { data: recentBadge } = await supabase
        .from('user_achievements')
        .select('badge_type, badge_name')
        .eq('user_id', user!.id)
        .order('date_awarded', { ascending: false })
        .limit(1)
        .single();

      // Calculate streak (simplified - consecutive days with activity)
      const { data: streakData } = await supabase
        .from('user_steps')
        .select('date, goal_reached')
        .eq('user_id', user!.id)
        .eq('goal_reached', true)
        .order('date', { ascending: false })
        .limit(30);

      let currentStreak = 0;
      if (streakData && streakData.length > 0) {
        const dates = streakData.map(d => new Date(d.date).getTime());
        const todayTime = new Date(today).getTime();
        const dayMs = 24 * 60 * 60 * 1000;

        for (let i = 0; i < dates.length; i++) {
          const expectedDate = todayTime - (i * dayMs);
          if (Math.abs(dates[i] - expectedDate) < dayMs) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      setStats({
        totalPoints,
        level: levelInfo.level,
        levelName: levelInfo.levelName,
        pointsToNextLevel: levelInfo.pointsToNextLevel,
        currentLevelPoints: levelInfo.currentLevelPoints,
        currentStreak,
        todayGoals: {
          steps: {
            current: stepsData?.step_count || 0,
            goal: 10000,
            completed: stepsData?.goal_reached || false
          },
          hydration: {
            current: hydrationData?.glasses_drank || 0,
            goal: 8,
            completed: (hydrationData?.glasses_drank || 0) >= 8
          }
        },
        recentBadge: recentBadge ? {
          name: recentBadge.badge_name,
          icon: recentBadge.badge_type
        } : null,
        activeChallenges: activeChallenges || 0
      });
    } catch (error) {
      console.error('Error fetching gamification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glassmorphism-card border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const levelProgress = stats.level < 6 
    ? (stats.currentLevelPoints / (stats.currentLevelPoints + stats.pointsToNextLevel)) * 100 
    : 100;

  return (
    <Card className="glassmorphism-card border-0 overflow-hidden">
      <CardContent className="p-0">
        {/* Header with Level & Points */}
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Trophy className="w-7 h-7 text-primary-foreground" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background flex items-center justify-center border-2 border-primary">
                  <span className="text-xs font-bold text-primary">{stats.level}</span>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-foreground">{stats.levelName}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold text-foreground">{stats.totalPoints}</span>
                  <span>points</span>
                </div>
              </div>
            </div>
            <Link to="/gamification-profile">
              <Button variant="ghost" size="sm" className="gap-1">
                View Profile
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          {/* Level Progress */}
          {stats.level < 6 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Level {stats.level}</span>
                <span>{stats.pointsToNextLevel} pts to Level {stats.level + 1}</span>
              </div>
              <Progress value={levelProgress} className="h-2" />
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="p-4 grid grid-cols-3 gap-3">
          {/* Streak */}
          <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-foreground">{stats.currentStreak}</div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </div>

          {/* Active Challenges */}
          <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Target className="w-6 h-6 text-primary mx-auto mb-1" />
            <div className="text-xl font-bold text-foreground">{stats.activeChallenges}</div>
            <div className="text-xs text-muted-foreground">Challenges</div>
          </div>

          {/* Today's Progress */}
          <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <Zap className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-foreground">
              {(stats.todayGoals.steps.completed ? 1 : 0) + (stats.todayGoals.hydration.completed ? 1 : 0)}/2
            </div>
            <div className="text-xs text-muted-foreground">Goals Done</div>
          </div>
        </div>

        {/* Today's Goals */}
        <div className="px-4 pb-4 space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Today's Goals
          </h4>
          
          {/* Steps Goal */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              stats.todayGoals.steps.completed 
                ? 'bg-green-500/20 text-green-600' 
                : 'bg-blue-500/20 text-blue-600'
            }`}>
              <Footprints className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Steps</span>
                <span className="text-xs text-muted-foreground">
                  {stats.todayGoals.steps.current.toLocaleString()} / {stats.todayGoals.steps.goal.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={(stats.todayGoals.steps.current / stats.todayGoals.steps.goal) * 100} 
                className="h-1.5" 
              />
            </div>
            {stats.todayGoals.steps.completed && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                ✓
              </Badge>
            )}
          </div>

          {/* Hydration Goal */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              stats.todayGoals.hydration.completed 
                ? 'bg-green-500/20 text-green-600' 
                : 'bg-cyan-500/20 text-cyan-600'
            }`}>
              <Droplets className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Hydration</span>
                <span className="text-xs text-muted-foreground">
                  {stats.todayGoals.hydration.current} / {stats.todayGoals.hydration.goal} glasses
                </span>
              </div>
              <Progress 
                value={(stats.todayGoals.hydration.current / stats.todayGoals.hydration.goal) * 100} 
                className="h-1.5" 
              />
            </div>
            {stats.todayGoals.hydration.completed && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                ✓
              </Badge>
            )}
          </div>

          {/* CTA Button */}
          <Button asChild className="w-full mt-2" variant="outline">
            <Link to="/health-challenges">
              <Trophy className="w-4 h-4 mr-2" />
              Continue Challenges
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
