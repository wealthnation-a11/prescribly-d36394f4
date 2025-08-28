import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Target, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Achievement {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string;
  date_awarded: string;
}

interface AchievementDisplayProps {
  currentStreak: number;
  todayGoalReached: boolean;
}

export default function AchievementDisplay({ currentStreak, todayGoalReached }: AchievementDisplayProps) {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  const fetchAchievements = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('date_awarded', { ascending: false });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIcon = (badgeType: string) => {
    switch (badgeType) {
      case 'daily_goal':
        return <Target className="h-4 w-4" />;
      case 'week_streak':
        return <Calendar className="h-4 w-4" />;
      case 'monthly_streak':
        return <Star className="h-4 w-4" />;
      case 'hundred_days':
        return <Trophy className="h-4 w-4" />;
      default:
        return <Trophy className="h-4 w-4" />;
    }
  };

  const getBadgeColor = (badgeType: string) => {
    switch (badgeType) {
      case 'daily_goal':
        return 'bg-green-500';
      case 'week_streak':
        return 'bg-blue-500';
      case 'monthly_streak':
        return 'bg-purple-500';
      case 'hundred_days':
        return 'bg-amber-500';
      default:
        return 'bg-primary';
    }
  };

  const upcomingAchievements = [
    {
      type: 'daily_goal',
      name: 'Daily Walker',
      description: 'Complete 5,000 steps in a day',
      progress: todayGoalReached ? 100 : 0,
      unlocked: achievements.some(a => a.badge_type === 'daily_goal')
    },
    {
      type: 'week_streak',
      name: 'Week Warrior',
      description: 'Maintain a 7-day walking streak',
      progress: Math.min((currentStreak / 7) * 100, 100),
      unlocked: achievements.some(a => a.badge_type === 'week_streak')
    },
    {
      type: 'monthly_streak',
      name: 'Step Master',
      description: 'Maintain a 30-day walking streak',
      progress: Math.min((currentStreak / 30) * 100, 100),
      unlocked: achievements.some(a => a.badge_type === 'monthly_streak')
    }
  ];

  if (loading) {
    return (
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse text-muted-foreground text-center py-4">
            Loading achievements...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Achievements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Earned Achievements */}
        {achievements.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Earned Badges</h4>
            <div className="space-y-2">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
                >
                  <div className={`h-10 w-10 rounded-full ${getBadgeColor(achievement.badge_type)} flex items-center justify-center text-white`}>
                    {getBadgeIcon(achievement.badge_type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{achievement.badge_name}</div>
                    <div className="text-sm text-muted-foreground">{achievement.badge_description}</div>
                    <div className="text-xs text-muted-foreground">
                      Earned {new Date(achievement.date_awarded).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Unlocked
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Towards Achievements */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Progress</h4>
          <div className="space-y-3">
            {upcomingAchievements.map((achievement) => (
              <div
                key={achievement.type}
                className={`p-3 rounded-lg border ${
                  achievement.unlocked 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                    : 'bg-muted/50 border-muted-foreground/20'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`h-8 w-8 rounded-full ${
                    achievement.unlocked ? getBadgeColor(achievement.type) : 'bg-muted-foreground'
                  } flex items-center justify-center text-white`}>
                    {getBadgeIcon(achievement.type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{achievement.name}</div>
                    <div className="text-sm text-muted-foreground">{achievement.description}</div>
                  </div>
                  {achievement.unlocked && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                      ✓
                    </Badge>
                  )}
                </div>
                
                {!achievement.unlocked && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${achievement.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}