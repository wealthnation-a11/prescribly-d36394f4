import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Moon,
  Plus,
  Minus,
  ArrowLeft,
  Zap,
  AlertCircle
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
  challenge_type: string;
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

interface ChallengeProgress {
  id: string;
  user_id: string;
  challenge_id: string;
  day_number: number;
  status: boolean;
  data: any;
  created_at: string;
}

interface ChallengeDetailProps {
  challenge: Challenge;
  userChallenge: UserChallenge | null;
  onBack: () => void;
  onProgressUpdate: () => void;
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
    fetchChallenges();
    fetchUserChallenges();
    fetchUserPoints();
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

  // Challenge-specific components
  const HydrationChallenge: React.FC<ChallengeDetailProps> = ({ challenge, userChallenge, onBack, onProgressUpdate }) => {
    const [glassesCount, setGlassesCount] = useState(0);
    const [todayProgress, setTodayProgress] = useState<ChallengeProgress | null>(null);

    useEffect(() => {
      fetchTodayProgress();
    }, [challenge.id]);

    const fetchTodayProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const currentDay = userChallenge ? userChallenge.progress + 1 : 1;
        const { data, error } = await supabase
          .from('challenge_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('challenge_id', challenge.id)
          .eq('day_number', currentDay)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        setTodayProgress(data);
        setGlassesCount((data?.data as any)?.glasses || 0);
      } catch (error: any) {
        console.error('Error fetching today progress:', error);
      }
    };

    const updateGlasses = async (newCount: number) => {
      if (newCount < 0 || newCount > 12) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const currentDay = userChallenge ? userChallenge.progress + 1 : 1;
        const isComplete = newCount >= 8;

        const progressData = {
          user_id: user.id,
          challenge_id: challenge.id,
          day_number: currentDay,
          status: isComplete,
          data: { glasses: newCount, target: 8 }
        };

        const { error } = await supabase
          .from('challenge_progress')
          .upsert(progressData, { 
            onConflict: 'user_id,challenge_id,day_number',
            ignoreDuplicates: false
          });

        if (error) throw error;

        setGlassesCount(newCount);
        
        if (isComplete && (!todayProgress || !todayProgress.status)) {
          toast({
            title: "Day Complete! 🎉",
            description: "+10 points earned for completing today's hydration goal!"
          });
          onProgressUpdate();
        }
      } catch (error: any) {
        toast({
          title: "Update Failed",
          description: error.message,
          variant: "destructive"
        });
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-100 border border-blue-200">
              <Droplets className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary">{challenge.title}</h2>
              <p className="text-muted-foreground">Day {(userChallenge?.progress || 0) + 1} of {challenge.duration}</p>
            </div>
          </div>
        </div>

        <Card className="glassmorphism-card border-0">
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Today's Hydration Goal</h3>
                <p className="text-muted-foreground">Drink 8 glasses of water to complete today's challenge</p>
              </div>

              <div className="space-y-4">
                <div className="text-4xl font-bold text-primary">{glassesCount} / 8</div>
                <Progress value={(glassesCount / 8) * 100} className="h-4" />
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => updateGlasses(glassesCount - 1)}
                  disabled={glassesCount <= 0}
                  className="p-4"
                >
                  <Minus className="h-6 w-6" />
                </Button>
                
                <div className="text-center">
                  <div className="text-2xl font-bold">{glassesCount}</div>
                  <div className="text-sm text-muted-foreground">glasses</div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => updateGlasses(glassesCount + 1)}
                  disabled={glassesCount >= 12}
                  className="p-4"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>

              {glassesCount >= 8 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Great job! You've reached today's hydration goal!</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const StepsChallenge: React.FC<ChallengeDetailProps> = ({ challenge, userChallenge, onBack, onProgressUpdate }) => {
    const [stepsCount, setStepsCount] = useState('');
    const [todayProgress, setTodayProgress] = useState<ChallengeProgress | null>(null);

    useEffect(() => {
      fetchTodayProgress();
    }, [challenge.id]);

    const fetchTodayProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const currentDay = userChallenge ? userChallenge.progress + 1 : 1;
        const { data, error } = await supabase
          .from('challenge_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('challenge_id', challenge.id)
          .eq('day_number', currentDay)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        setTodayProgress(data);
        setStepsCount((data?.data as any)?.steps?.toString() || '');
      } catch (error: any) {
        console.error('Error fetching today progress:', error);
      }
    };

    const updateSteps = async () => {
      const steps = parseInt(stepsCount);
      if (isNaN(steps) || steps < 0) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const currentDay = userChallenge ? userChallenge.progress + 1 : 1;
        const isComplete = steps >= 5000;

        const progressData = {
          user_id: user.id,
          challenge_id: challenge.id,
          day_number: currentDay,
          status: isComplete,
          data: { steps, target: 5000 }
        };

        const { error } = await supabase
          .from('challenge_progress')
          .upsert(progressData, { 
            onConflict: 'user_id,challenge_id,day_number',
            ignoreDuplicates: false
          });

        if (error) throw error;
        
        if (isComplete && (!todayProgress || !todayProgress.status)) {
          toast({
            title: "Day Complete! 🎉",
            description: "+10 points earned for reaching your step goal!"
          });
          onProgressUpdate();
        }

        fetchTodayProgress();
      } catch (error: any) {
        toast({
          title: "Update Failed",
          description: error.message,
          variant: "destructive"
        });
      }
    };

    const steps = parseInt(stepsCount) || 0;
    const progress = Math.min((steps / 5000) * 100, 100);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-green-100 border border-green-200">
              <Footprints className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary">{challenge.title}</h2>
              <p className="text-muted-foreground">Day {(userChallenge?.progress || 0) + 1} of {challenge.duration}</p>
            </div>
          </div>
        </div>

        <Card className="glassmorphism-card border-0">
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Today's Step Goal</h3>
                <p className="text-muted-foreground">Walk 5,000 steps to complete today's challenge</p>
              </div>

              <div className="space-y-4">
                <div className="text-4xl font-bold text-primary">{steps.toLocaleString()} / 5,000</div>
                <Progress value={progress} className="h-4" />
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="steps">Enter your step count</Label>
                  <Input
                    id="steps"
                    type="number"
                    value={stepsCount}
                    onChange={(e) => setStepsCount(e.target.value)}
                    placeholder="Enter steps..."
                    className="text-center text-lg"
                  />
                </div>

                <Button
                  onClick={updateSteps}
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={!stepsCount}
                >
                  Update Steps
                </Button>
              </div>

              {steps >= 5000 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Excellent! You've reached your daily step goal!</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const MeditationChallenge: React.FC<ChallengeDetailProps> = ({ challenge, userChallenge, onBack, onProgressUpdate }) => {
    const [todayProgress, setTodayProgress] = useState<ChallengeProgress | null>(null);
    const [dailyQuote] = useState([
      "Take time to breathe deeply and center yourself.",
      "Mindfulness is about being fully awake in our lives.",
      "Peace comes from within. Do not seek it without.",
      "The present moment is the only time over which we have dominion.",
      "Meditation is not evasion; it is a serene encounter with reality.",
      "In the midst of chaos, find stillness.",
      "Your calm mind is the ultimate weapon against your challenges."
    ]);

    useEffect(() => {
      fetchTodayProgress();
    }, [challenge.id]);

    const fetchTodayProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const currentDay = userChallenge ? userChallenge.progress + 1 : 1;
        const { data, error } = await supabase
          .from('challenge_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('challenge_id', challenge.id)
          .eq('day_number', currentDay)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        setTodayProgress(data);
      } catch (error: any) {
        console.error('Error fetching today progress:', error);
      }
    };

    const markMeditationComplete = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const currentDay = userChallenge ? userChallenge.progress + 1 : 1;

        const progressData = {
          user_id: user.id,
          challenge_id: challenge.id,
          day_number: currentDay,
          status: true,
          data: { completed_at: new Date().toISOString() }
        };

        const { error } = await supabase
          .from('challenge_progress')
          .upsert(progressData, { 
            onConflict: 'user_id,challenge_id,day_number',
            ignoreDuplicates: false
          });

        if (error) throw error;

        toast({
          title: "Day Complete! 🧘",
          description: "+10 points earned for completing today's meditation!"
        });
        
        onProgressUpdate();
        fetchTodayProgress();
      } catch (error: any) {
        toast({
          title: "Update Failed",
          description: error.message,
          variant: "destructive"
        });
      }
    };

    const currentDay = (userChallenge?.progress || 0) + 1;
    const todayQuote = dailyQuote[Math.min(currentDay - 1, dailyQuote.length - 1)];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-purple-100 border border-purple-200">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary">{challenge.title}</h2>
              <p className="text-muted-foreground">Day {currentDay} of {challenge.duration}</p>
            </div>
          </div>
        </div>

        <Card className="glassmorphism-card border-0">
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Today's Mindfulness</h3>
                <p className="text-muted-foreground">Take 10 minutes for meditation and reflection</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-lg">
                <div className="text-lg font-medium text-purple-800 mb-2">Daily Inspiration</div>
                <div className="text-purple-700 italic">"{todayQuote}"</div>
              </div>

              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Find a quiet space, sit comfortably, and focus on your breath for at least 10 minutes.
                </div>

                {!todayProgress?.status ? (
                  <Button
                    onClick={markMeditationComplete}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Mark Meditation Complete
                  </Button>
                ) : (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Today's meditation completed! Well done!</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const SleepChallenge: React.FC<ChallengeDetailProps> = ({ challenge, userChallenge, onBack, onProgressUpdate }) => {
    const [bedtime, setBedtime] = useState('');
    const [wakeTime, setWakeTime] = useState('');
    const [todayProgress, setTodayProgress] = useState<ChallengeProgress | null>(null);

    useEffect(() => {
      fetchTodayProgress();
    }, [challenge.id]);

    const fetchTodayProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const currentDay = userChallenge ? userChallenge.progress + 1 : 1;
        const { data, error } = await supabase
          .from('challenge_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('challenge_id', challenge.id)
          .eq('day_number', currentDay)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        setTodayProgress(data);
        setBedtime((data?.data as any)?.bedtime || '');
        setWakeTime((data?.data as any)?.wake_time || '');
      } catch (error: any) {
        console.error('Error fetching today progress:', error);
      }
    };

    const calculateSleepHours = () => {
      if (!bedtime || !wakeTime) return 0;
      
      const bedDate = new Date(`2000-01-01T${bedtime}:00`);
      let wakeDate = new Date(`2000-01-01T${wakeTime}:00`);
      
      // If wake time is earlier than bedtime, add a day
      if (wakeDate <= bedDate) {
        wakeDate = new Date(`2000-01-02T${wakeTime}:00`);
      }
      
      const diffMs = wakeDate.getTime() - bedDate.getTime();
      return diffMs / (1000 * 60 * 60);
    };

    const updateSleep = async () => {
      if (!bedtime || !wakeTime) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const sleepHours = calculateSleepHours();
        const currentDay = userChallenge ? userChallenge.progress + 1 : 1;
        const isComplete = sleepHours >= 7;

        const progressData = {
          user_id: user.id,
          challenge_id: challenge.id,
          day_number: currentDay,
          status: isComplete,
          data: { bedtime, wake_time: wakeTime, sleep_hours: sleepHours, target: 7 }
        };

        const { error } = await supabase
          .from('challenge_progress')
          .upsert(progressData, { 
            onConflict: 'user_id,challenge_id,day_number',
            ignoreDuplicates: false
          });

        if (error) throw error;
        
        if (isComplete && (!todayProgress || !todayProgress.status)) {
          toast({
            title: "Day Complete! 😴",
            description: "+10 points earned for getting healthy sleep!"
          });
          onProgressUpdate();
        }

        fetchTodayProgress();
      } catch (error: any) {
        toast({
          title: "Update Failed",
          description: error.message,
          variant: "destructive"
        });
      }
    };

    const sleepHours = calculateSleepHours();

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-indigo-100 border border-indigo-200">
              <Moon className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary">{challenge.title}</h2>
              <p className="text-muted-foreground">Day {(userChallenge?.progress || 0) + 1} of {challenge.duration}</p>
            </div>
          </div>
        </div>

        <Card className="glassmorphism-card border-0">
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Sleep Tracking</h3>
                <p className="text-muted-foreground">Get at least 7 hours of sleep for healthy rest</p>
              </div>

              {sleepHours > 0 && (
                <div className="space-y-4">
                  <div className="text-4xl font-bold text-primary">{sleepHours.toFixed(1)} hours</div>
                  <Progress value={Math.min((sleepHours / 7) * 100, 100)} className="h-4" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bedtime">Bedtime</Label>
                  <Input
                    id="bedtime"
                    type="time"
                    value={bedtime}
                    onChange={(e) => setBedtime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="wake-time">Wake Time</Label>
                  <Input
                    id="wake-time"
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={updateSleep}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={!bedtime || !wakeTime}
              >
                Log Sleep Time
              </Button>

              {sleepHours >= 7 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Great! You got healthy sleep last night!</span>
                  </div>
                </div>
              )}

              {sleepHours > 0 && sleepHours < 7 && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-700">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Try to get more sleep tonight for better health!</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render challenge-specific detail view
  const renderChallengeDetail = () => {
    if (!selectedChallenge) return null;

    const userChallenge = getUserChallengeStatus(selectedChallenge.id);
    
    const props = {
      challenge: selectedChallenge,
      userChallenge,
      onBack: () => setSelectedChallenge(null),
      onProgressUpdate: () => {
        fetchUserChallenges();
        fetchUserPoints();
      }
    };

    switch (selectedChallenge.challenge_type) {
      case 'hydration':
        return <HydrationChallenge {...props} />;
      case 'steps':
        return <StepsChallenge {...props} />;
      case 'meditation':
        return <MeditationChallenge {...props} />;
      case 'sleep':
        return <SleepChallenge {...props} />;
      default:
        return null;
    }
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

  // Show challenge detail view if a challenge is selected
  if (selectedChallenge) {
    return (
      <div className="min-h-screen medical-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {renderChallengeDetail()}
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
              <h1 className="text-4xl font-bold text-primary">Health Challenge Hub</h1>
              <p className="text-lg text-primary/80 font-medium">Interactive Wellness Challenges</p>
            </div>
          </div>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Join interactive challenges, track daily progress, and earn points for building healthy habits
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

        {/* Interactive Challenges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {challenges.map((challenge) => {
            const userStatus = getUserChallengeStatus(challenge.id);
            const isJoined = !!userStatus;
            const progressPercentage = userStatus ? (userStatus.progress / challenge.duration) * 100 : 0;
            const isCompleted = userStatus?.status === 'completed';
            const IconComponent = getChallengeIcon(challenge.title);

            return (
              <Card key={challenge.id} className="glassmorphism-card border-0 hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                    onClick={() => {
                      if (isJoined) {
                        setSelectedChallenge(challenge);
                      }
                    }}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                        <IconComponent className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-primary mb-1">{challenge.title}</CardTitle>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{challenge.duration} days</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            <span>{challenge.points_per_day} pts/day</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {isCompleted && (
                      <Badge className="bg-green-500 hover:bg-green-500">
                        <Award className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{challenge.description}</p>
                  
                  {isJoined && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Progress</span>
                        <span className="text-primary font-semibold">{userStatus.progress}/{challenge.duration} days</span>
                      </div>
                      <Progress value={progressPercentage} className="h-3" />
                      <div className="text-xs text-muted-foreground text-center">
                        {userStatus.points_earned} points earned
                      </div>
                    </div>
                  )}

                  {!isJoined ? (
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        joinChallenge(challenge);
                      }}
                      className="w-full bg-primary hover:bg-primary/90 h-11"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Join Challenge
                    </Button>
                  ) : !isCompleted ? (
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChallenge(challenge);
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-600 h-11"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Continue Challenge
                    </Button>
                  ) : (
                    <Button disabled className="w-full bg-green-500 h-11">
                      <Award className="h-4 w-4 mr-2" />
                      Challenge Completed!
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty state for no challenges */}
        {challenges.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Active Challenges</h3>
            <p className="text-muted-foreground">Check back soon for new wellness challenges!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthChallenges;