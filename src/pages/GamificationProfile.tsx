import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Link } from "react-router-dom";
import { 
  Trophy, 
  Star, 
  Flame, 
  Target,
  Medal,
  Crown,
  Droplets,
  Footprints,
  Brain,
  Moon,
  Heart,
  Stethoscope,
  Calendar,
  TrendingUp,
  ArrowLeft,
  Award,
  Zap,
  CheckCircle2
} from "lucide-react";

interface Achievement {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string;
  date_awarded: string;
}

interface UserStats {
  totalPoints: number;
  level: number;
  levelName: string;
  pointsToNextLevel: number;
  currentLevelPoints: number;
  pointsInLevel: number;
  totalChallengesCompleted: number;
  totalChallengesJoined: number;
  longestStreak: number;
  currentStreak: number;
  totalSteps: number;
  totalGlasses: number;
  achievements: Achievement[];
}

const LEVELS = [
  { name: "Beginner", minPoints: 0, maxPoints: 100, icon: "🌱" },
  { name: "Health Rookie", minPoints: 101, maxPoints: 500, icon: "🌿" },
  { name: "Wellness Warrior", minPoints: 501, maxPoints: 1000, icon: "⚔️" },
  { name: "Health Champion", minPoints: 1001, maxPoints: 2500, icon: "🏆" },
  { name: "Wellness Master", minPoints: 2501, maxPoints: 5000, icon: "👑" },
  { name: "Health Legend", minPoints: 5001, maxPoints: Infinity, icon: "🌟" },
];

const BADGE_ICONS: { [key: string]: React.ElementType } = {
  'hydration': Droplets,
  'steps': Footprints,
  'streak': Flame,
  'challenge': Trophy,
  'meditation': Brain,
  'sleep': Moon,
  'health': Heart,
  'consultation': Stethoscope,
  'default': Medal
};

const BADGE_COLORS: { [key: string]: string } = {
  'hydration': 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30',
  'steps': 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  'streak': 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  'challenge': 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  'meditation': 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  'sleep': 'bg-indigo-500/20 text-indigo-600 border-indigo-500/30',
  'health': 'bg-pink-500/20 text-pink-600 border-pink-500/30',
  'consultation': 'bg-green-500/20 text-green-600 border-green-500/30',
  'default': 'bg-primary/20 text-primary border-primary/30'
};

const getLevelInfo = (points: number) => {
  for (let i = 0; i < LEVELS.length; i++) {
    if (points <= LEVELS[i].maxPoints) {
      const level = i + 1;
      const levelName = LEVELS[i].name;
      const levelIcon = LEVELS[i].icon;
      const prevMax = i > 0 ? LEVELS[i - 1].maxPoints : 0;
      const currentLevelPoints = points - prevMax;
      const pointsInLevel = LEVELS[i].maxPoints - prevMax;
      const pointsToNextLevel = LEVELS[i].maxPoints - points;
      return { level, levelName, levelIcon, currentLevelPoints, pointsInLevel, pointsToNextLevel };
    }
  }
  return { 
    level: 6, 
    levelName: "Health Legend", 
    levelIcon: "🌟",
    currentLevelPoints: 0, 
    pointsInLevel: 1, 
    pointsToNextLevel: 0 
  };
};

const GamificationProfile = () => {
  usePageSEO({
    title: "My Wellness Profile - Prescribly",
    description: "Track your health achievements, levels, badges and wellness journey progress.",
    canonicalPath: "/gamification-profile"
  });

  const { user, userProfile } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchAllStats();
    }
  }, [user?.id]);

  const fetchAllStats = async () => {
    try {
      // Fetch user points
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', user!.id)
        .single();

      const totalPoints = pointsData?.points || 0;
      const levelInfo = getLevelInfo(totalPoints);

      // Fetch challenges stats
      const { data: challengesData } = await supabase
        .from('user_challenges')
        .select('status')
        .eq('user_id', user!.id);

      const totalChallengesJoined = challengesData?.length || 0;
      const totalChallengesCompleted = challengesData?.filter(c => c.status === 'completed').length || 0;

      // Fetch achievements
      const { data: achievementsData } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user!.id)
        .order('date_awarded', { ascending: false });

      // Fetch steps stats
      const { data: stepsData } = await supabase
        .from('user_steps')
        .select('step_count, goal_reached, date')
        .eq('user_id', user!.id)
        .order('date', { ascending: false });

      const totalSteps = stepsData?.reduce((sum, day) => sum + (day.step_count || 0), 0) || 0;

      // Calculate streaks
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      if (stepsData && stepsData.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const dates = stepsData
          .filter(d => d.goal_reached)
          .map(d => d.date)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        // Calculate current streak
        for (let i = 0; i < dates.length; i++) {
          const expectedDate = new Date(today);
          expectedDate.setDate(expectedDate.getDate() - i);
          const expectedStr = expectedDate.toISOString().split('T')[0];
          
          if (dates[i] === expectedStr) {
            currentStreak++;
          } else {
            break;
          }
        }

        // Calculate longest streak
        for (let i = 0; i < dates.length; i++) {
          if (i === 0) {
            tempStreak = 1;
          } else {
            const prevDate = new Date(dates[i - 1]);
            const currDate = new Date(dates[i]);
            const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              tempStreak++;
            } else {
              longestStreak = Math.max(longestStreak, tempStreak);
              tempStreak = 1;
            }
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      }

      // Fetch hydration stats
      const { data: hydrationData } = await supabase
        .from('user_hydration_log')
        .select('glasses_drank')
        .eq('user_id', user!.id);

      const totalGlasses = hydrationData?.reduce((sum, day) => sum + (day.glasses_drank || 0), 0) || 0;

      setStats({
        totalPoints,
        level: levelInfo.level,
        levelName: levelInfo.levelName,
        pointsToNextLevel: levelInfo.pointsToNextLevel,
        currentLevelPoints: levelInfo.currentLevelPoints,
        pointsInLevel: levelInfo.pointsInLevel,
        totalChallengesCompleted,
        totalChallengesJoined,
        longestStreak,
        currentStreak,
        totalSteps,
        totalGlasses,
        achievements: (achievementsData || []).map(a => ({
          ...a,
          date_awarded: a.date_awarded
        })) as Achievement[]
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen medical-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen medical-background flex items-center justify-center">
        <p className="text-muted-foreground">Unable to load profile data.</p>
      </div>
    );
  }

  const levelProgress = stats.level < 6 
    ? (stats.currentLevelPoints / stats.pointsInLevel) * 100 
    : 100;

  const levelInfo = getLevelInfo(stats.totalPoints);

  return (
    <div className="min-h-screen medical-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="ghost" size="icon">
            <Link to="/user-dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Wellness Profile</h1>
            <p className="text-muted-foreground">Track your health journey progress</p>
          </div>
        </div>

        {/* Level Card */}
        <Card className="glassmorphism-card border-0 mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-primary via-accent to-primary p-6 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl">
                  {levelInfo.levelIcon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    <span className="text-sm font-medium opacity-90">Level {stats.level}</span>
                  </div>
                  <h2 className="text-2xl font-bold">{stats.levelName}</h2>
                  <p className="opacity-80">
                    {userProfile?.first_name || 'Wellness'} {userProfile?.last_name || 'Champion'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{stats.totalPoints}</div>
                <div className="flex items-center gap-1 justify-end opacity-90">
                  <Star className="w-4 h-4 fill-current" />
                  <span>Total Points</span>
                </div>
              </div>
            </div>

            {/* Level Progress */}
            {stats.level < 6 && (
              <div className="mt-6">
                <div className="flex justify-between text-sm opacity-90 mb-2">
                  <span>Progress to {LEVELS[stats.level]?.name || 'Next Level'}</span>
                  <span>{stats.pointsToNextLevel} points to go</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${levelProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="glassmorphism-card border-0">
            <CardContent className="p-4 text-center">
              <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{stats.currentStreak}</div>
              <div className="text-xs text-muted-foreground">Current Streak</div>
            </CardContent>
          </Card>

          <Card className="glassmorphism-card border-0">
            <CardContent className="p-4 text-center">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{stats.longestStreak}</div>
              <div className="text-xs text-muted-foreground">Longest Streak</div>
            </CardContent>
          </Card>

          <Card className="glassmorphism-card border-0">
            <CardContent className="p-4 text-center">
              <Target className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{stats.totalChallengesCompleted}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </CardContent>
          </Card>

          <Card className="glassmorphism-card border-0">
            <CardContent className="p-4 text-center">
              <Award className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{stats.achievements.length}</div>
              <div className="text-xs text-muted-foreground">Badges Earned</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Badges & Stats */}
        <Tabs defaultValue="badges" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="badges" className="gap-2">
              <Medal className="w-4 h-4" />
              Badges & Achievements
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Lifetime Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="badges">
            <Card className="glassmorphism-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Your Trophy Case
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.achievements.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {stats.achievements.map((achievement) => {
                      const badgeType = achievement.badge_type.toLowerCase();
                      const IconComponent = BADGE_ICONS[badgeType] || BADGE_ICONS.default;
                      const colorClass = BADGE_COLORS[badgeType] || BADGE_COLORS.default;

                      return (
                        <div 
                          key={achievement.id}
                          className={`p-4 rounded-xl border ${colorClass} text-center`}
                        >
                          <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center bg-background/50">
                            <IconComponent className="w-6 h-6" />
                          </div>
                          <div className="font-semibold text-sm">{achievement.badge_name}</div>
                          <div className="text-xs opacity-70">
                            {new Date(achievement.date_awarded).toLocaleDateString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Medal className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">No badges earned yet</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Complete challenges to earn your first badge!
                    </p>
                    <Button asChild className="mt-4" variant="outline">
                      <Link to="/health-challenges">Start a Challenge</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <Card className="glassmorphism-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Lifetime Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Footprints className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-medium">Total Steps</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">
                    {stats.totalSteps.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Droplets className="w-5 h-5 text-cyan-600" />
                    </div>
                    <span className="font-medium">Total Glasses of Water</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">
                    {stats.totalGlasses.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium">Challenges Joined</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">
                    {stats.totalChallengesJoined}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="font-medium">Challenges Completed</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">
                    {stats.totalChallengesCompleted}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Button asChild size="lg">
            <Link to="/health-challenges">
              <Trophy className="w-5 h-5 mr-2" />
              Join More Challenges
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GamificationProfile;
