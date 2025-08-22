import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePageSEO } from '@/hooks/usePageSEO';
import { 
  Trophy,
  Users,
  Calendar,
  Target,
  Award,
  TrendingUp,
  CheckCircle,
  Clock,
  Star,
  Droplets,
  Footprints,
  Brain,
  Moon
} from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  duration: number;
  start_date: string;
  end_date: string;
  points_per_day: number;
  total_points: number;
  active: boolean;
}

interface UserChallenge {
  id: string;
  challenge_id: string;
  progress: number;
  points_earned: number;
  status: string;
  joined_at: string;
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  points_earned: number;
  progress: number;
  rank: number;
}

const challengeIcons: { [key: string]: React.ElementType } = {
  'Hydration': Droplets,
  'Walk': Footprints,
  'Steps': Footprints,
  'Meditation': Brain,
  'Sleep': Moon,
  'default': Target
};

const HealthChallenges = () => {
  usePageSEO({
    title: "Health Challenges - Prescribly",
    description: "Join community health challenges, track your progress, and earn points while improving your wellness.",
    canonicalPath: "/health-challenges"
  });

  const { toast } = useToast();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchChallenges(),
        fetchUserChallenges(),
        fetchUserPoints()
      ]);
    };
    loadData();
  }, []);

  const fetchChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch challenges.",
        variant: "destructive"
      });
    }
  };

  const fetchUserChallenges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setUserChallenges(data || []);
    } catch (error: any) {
      console.error('Error fetching user challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPoints = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTotalPoints(data?.points || 0);
    } catch (error: any) {
      console.error('Error fetching user points:', error);
    }
  };

  const fetchLeaderboard = async (challengeId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_challenge_leaderboard', { challenge_uuid: challengeId });

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const joinChallenge = async (challenge: Challenge) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to join challenges.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          challenge_id: challenge.id
        });

      if (error) throw error;

      toast({
        title: "Challenge Joined!",
        description: `You've joined the ${challenge.title}. Good luck!`
      });

      fetchUserChallenges();
    } catch (error: any) {
      toast({
        title: "Failed to Join",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const markDayComplete = async (userChallengeId: string, challenge: Challenge) => {
    try {
      const userChallenge = userChallenges.find(uc => uc.id === userChallengeId);
      if (!userChallenge || userChallenge.progress >= challenge.duration) return;

      const newProgress = userChallenge.progress + 1;
      const newPointsEarned = userChallenge.points_earned + challenge.points_per_day;
      const isCompleted = newProgress >= challenge.duration;

      const { error } = await supabase
        .from('user_challenges')
        .update({
          progress: newProgress,
          points_earned: newPointsEarned,
          status: isCompleted ? 'completed' : 'active',
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', userChallengeId);

      if (error) throw error;

      // Update user total points
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('update_user_points', {
          user_uuid: user.id,
          points_to_add: challenge.points_per_day
        });
      }

      toast({
        title: "Progress Updated!",
        description: `+${challenge.points_per_day} points earned! ${isCompleted ? '🎉 Challenge completed!' : ''}`
      });

      fetchUserChallenges();
      fetchUserPoints();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getChallengeIcon = (title: string) => {
    const iconKey = Object.keys(challengeIcons).find(key => title.includes(key)) || 'default';
    return challengeIcons[iconKey];
  };

  const getUserChallengeStatus = (challengeId: string) => {
    return userChallenges.find(uc => uc.challenge_id === challengeId);
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <div className="min-h-screen medical-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading challenges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen medical-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-primary">Health Challenges</h1>
              <p className="text-lg text-primary/80 font-medium">Community Wellness & Achievements</p>
            </div>
          </div>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Join weekly challenges, track your progress, compete with others, and earn points for healthy habits
          </p>
        </div>

        {/* Points Display */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="glassmorphism-card border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-yellow-100 border border-yellow-200">
                    <Star className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-primary">Your Points</h3>
                    <p className="text-sm text-muted-foreground">Total wellness achievements</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{totalPoints}</div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Active Challenger
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Challenges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {challenges.map((challenge) => {
            const userStatus = getUserChallengeStatus(challenge.id);
            const isJoined = !!userStatus;
            const progressPercentage = userStatus ? (userStatus.progress / challenge.duration) * 100 : 0;
            const isCompleted = userStatus?.status === 'completed';
            const daysRemaining = getDaysRemaining(challenge.end_date);
            const IconComponent = getChallengeIcon(challenge.title);

            return (
              <Card key={challenge.id} className="glassmorphism-card border-0 hover:scale-105 transition-all duration-300 cursor-pointer"
                    onClick={() => {
                      setSelectedChallenge(challenge);
                      fetchLeaderboard(challenge.id);
                    }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-primary">{challenge.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{challenge.duration} days</span>
                        </div>
                      </div>
                    </div>
                    {isCompleted && (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{challenge.description}</p>
                  
                  {isJoined && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">{userStatus.progress}/{challenge.duration} days</span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Trophy className="h-4 w-4" />
                      <span>{challenge.points_per_day} pts/day</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{daysRemaining} days left</span>
                    </div>
                  </div>

                  {!isJoined ? (
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        joinChallenge(challenge);
                      }}
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      Join Challenge
                    </Button>
                  ) : !isCompleted ? (
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        markDayComplete(userStatus.id, challenge);
                      }}
                      className="w-full bg-green-500 hover:bg-green-600"
                      disabled={userStatus.progress >= challenge.duration}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Today Complete
                    </Button>
                  ) : (
                    <Button disabled className="w-full bg-green-500">
                      <Award className="h-4 w-4 mr-2" />
                      Challenge Completed!
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Challenge Detail Modal/Sidebar */}
        {selectedChallenge && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
               onClick={() => setSelectedChallenge(null)}>
            <Card className="glassmorphism-card border-0 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl text-primary">{selectedChallenge.title}</CardTitle>
                  <Button variant="ghost" onClick={() => setSelectedChallenge(null)}>
                    ×
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Leaderboard */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Leaderboard
                  </h3>
                  <div className="space-y-2">
                    {leaderboard.slice(0, 10).map((entry, index) => (
                      <div key={entry.user_id} className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-primary/10 text-primary'
                          }`}>
                            {entry.rank}
                          </div>
                          <span className="font-medium">{entry.username}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-primary">{entry.points_earned} pts</div>
                          <div className="text-xs text-muted-foreground">{entry.progress}/{selectedChallenge.duration} days</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthChallenges;