import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePageSEO } from '@/hooks/usePageSEO';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Trophy,
  Brain,
  Droplets,
  Activity,
  Heart,
  Moon,
  Flame
} from 'lucide-react';

interface CheckinData {
  date: string;
  category: string;
  answer: string;
  question_text: string;
}

interface TrendData {
  category: string;
  count: number;
  percentage: number;
}

const HealthTrendsDashboard = () => {
  usePageSEO({
    title: "Health Trends Dashboard - Prescribly",
    description: "Track your health trends and wellness journey with visual insights from your daily check-ins.",
    canonicalPath: "/health-trends"
  });

  const { toast } = useToast();
  const [checkinData, setCheckinData] = useState<CheckinData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');

  useEffect(() => {
    loadHealthData();
    loadUserPoints();
  }, [timeRange]);

  const loadHealthData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const daysBack = timeRange === 'week' ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from('user_daily_checkins')
        .select('date, answer, question_id')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        date: item.date,
        category: getCategoryFromQuestionId(item.question_id),
        answer: item.answer,
        question_text: getQuestionText(item.question_id)
      })) || [];

      setCheckinData(formattedData);
      calculateStreak(data || []);
    } catch (error: any) {
      console.error('Error loading health data:', error);
      toast({
        title: "Error",
        description: "Failed to load health trends data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserPoints = async () => {
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
      console.error('Error loading user points:', error);
    }
  };

  const calculateStreak = (data: any[]) => {
    if (!data.length) {
      setStreak(0);
      return;
    }

    // Group by date and count consecutive days
    const uniqueDates = [...new Set(data.map(item => item.date))].sort();
    let currentStreak = 0;
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = uniqueDates.length - 1; i >= 0; i--) {
      const checkDate = new Date(uniqueDates[i]);
      checkDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === currentStreak) {
        currentStreak++;
      } else {
        break;
      }
    }

    setStreak(currentStreak);
  };

  // Helper functions to categorize questions based on ID patterns
  const getCategoryFromQuestionId = (questionId: number | null): string => {
    if (!questionId) return 'general';
    
    // Map question IDs to categories (these can be adjusted based on actual data)
    if (questionId <= 2) return 'sleep';
    if (questionId <= 4) return 'hydration';
    if (questionId <= 6) return 'exercise';
    if (questionId <= 8) return 'nutrition';
    if (questionId <= 10) return 'stress';
    if (questionId <= 12) return 'mental_health';
    return 'outdoor';
  };

  const getQuestionText = (questionId: number | null): string => {
    if (!questionId) return 'Daily check-in';
    
    // Map question IDs to question text (these can be adjusted based on actual data)
    const questionMap: Record<number, string> = {
      1: 'How many hours did you sleep?',
      2: 'How would you rate your sleep quality?',
      3: 'How many glasses of water did you drink?',
      4: 'Did you stay hydrated today?',
      5: 'Did you exercise today?',
      6: 'How many minutes did you exercise?',
      7: 'Did you eat healthy meals?',
      8: 'How many servings of vegetables did you have?',
      9: 'Did you feel stressed today?',
      10: 'How would you rate your stress level?',
      11: 'How is your mood today?',
      12: 'Did you practice mindfulness?',
    };
    
    return questionMap[questionId] || 'Daily wellness check-in';
  };

  const getSleepTrends = () => {
    const sleepData = checkinData.filter(item => item.category === 'sleep');
    const weeklyData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = sleepData.find(item => item.date === dateStr);
      const hours = dayData ? parseFloat(dayData.answer) || 0 : 0;
      
      weeklyData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        hours: hours
      });
    }
    
    return weeklyData;
  };

  const getActivityTrends = () => {
    const categories = ['hydration', 'exercise', 'nutrition', 'outdoor'];
    const data = categories.map(category => {
      const categoryData = checkinData.filter(item => item.category === category);
      const positiveAnswers = categoryData.filter(item => 
        item.answer.toLowerCase().includes('yes') || 
        parseInt(item.answer) > 0
      ).length;
      
      return {
        category: category.charAt(0).toUpperCase() + category.slice(1),
        count: positiveAnswers,
        total: categoryData.length,
        percentage: categoryData.length > 0 ? Math.round((positiveAnswers / categoryData.length) * 100) : 0
      };
    });
    
    return data;
  };

  const getStressTrends = () => {
    const stressData = checkinData.filter(item => 
      item.category === 'stress' || item.category === 'mental_health'
    );
    
    const stressedDays = stressData.filter(item => 
      item.answer.toLowerCase().includes('yes') || 
      item.answer.toLowerCase().includes('stressed') ||
      item.answer.toLowerCase().includes('anxious') ||
      item.answer.toLowerCase().includes('down')
    ).length;
    
    const totalDays = stressData.length;
    const stressPercentage = totalDays > 0 ? Math.round((stressedDays / totalDays) * 100) : 0;
    
    return [
      { name: 'Good Days', value: 100 - stressPercentage, color: '#10b981' },
      { name: 'Stressed Days', value: stressPercentage, color: '#ef4444' }
    ];
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (isLoading) {
    return (
      <div className="min-h-screen medical-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading your health trends...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen medical-background relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-primary">Health Trends Dashboard</h1>
              <p className="text-lg text-primary/80 font-medium">Your Wellness Journey</p>
            </div>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex justify-center gap-2 mb-6">
            <Button 
              variant={timeRange === 'week' ? 'default' : 'outline'}
              onClick={() => setTimeRange('week')}
              className="rounded-full"
            >
              This Week
            </Button>
            <Button 
              variant={timeRange === 'month' ? 'default' : 'outline'}
              onClick={() => setTimeRange('month')}
              className="rounded-full"
            >
              This Month
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glassmorphism-card border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Points</p>
                  <p className="text-2xl font-bold text-primary">{totalPoints}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism-card border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-500/10 border border-orange-500/20">
                  <Flame className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-2xl font-bold text-primary">{streak} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism-card border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10 border border-green-500/20">
                  <Calendar className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-ins</p>
                  <p className="text-2xl font-bold text-primary">{checkinData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sleep Trends */}
          <Card className="glassmorphism-card border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-primary" />
                Sleep Trends (Hours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getSleepTrends()}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value} hours`, 'Sleep']}
                    labelStyle={{ color: '#1f2937' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Activity Consistency */}
          <Card className="glassmorphism-card border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Activity Consistency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getActivityTrends()}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Consistency']}
                    labelStyle={{ color: '#1f2937' }}
                  />
                  <Bar 
                    dataKey="percentage" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Mental Wellness */}
          <Card className="glassmorphism-card border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Mental Wellness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getStressTrends()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getStressTrends().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, 'Days']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Health Score Summary */}
          <Card className="glassmorphism-card border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Health Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getActivityTrends().map((trend, index) => (
                  <div key={trend.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{trend.category}</span>
                    </div>
                    <Badge 
                      variant={trend.percentage >= 70 ? 'default' : 'secondary'}
                      className="ml-2"
                    >
                      {trend.percentage}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Button */}
        <div className="text-center mt-8">
          <Button 
            onClick={() => window.location.href = '/ai-health-companion'}
            className="rounded-full px-8 py-3 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <Brain className="h-5 w-5 mr-2" />
            Today's Check-in
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HealthTrendsDashboard;