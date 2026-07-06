import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePageSEO } from '@/hooks/usePageSEO';
import { useUserRole } from '@/hooks/useUserRole';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import {
  Brain,
  Send,
  Loader2,
  Sparkles,
  User,
  Trophy,
  CheckCircle,
  BarChart3,
  ArrowLeft,
  Flame,
  Heart,
} from 'lucide-react';

interface Question {
  id: number;
  category: string;
  question_text: string;
}

interface Message {
  id: string;
  text: string;
  isAi: boolean;
  timestamp: Date;
  isTyping?: boolean;
}

const AIHealthCompanion = () => {
  usePageSEO({
    title: 'Gift — Your AI Health Companion | Prescribly',
    description: 'Chat with Gift, your AI health companion. Complete a daily check-in and earn wellness points.',
    canonicalPath: '/ai-health-companion',
  });

  const { toast } = useToast();
  const { isDoctor } = useUserRole();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const loadDailyQuestions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().slice(0, 10);
        const cacheKey = `daily-health-questions-${user.id}-${today}`;
        let questionList: Question[] = [];

        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try { questionList = JSON.parse(cached); } catch { /* ignore */ }
        }

        if (!questionList.length) {
          const { data: gen, error: genError } = await supabase.functions.invoke(
            'generate-daily-health-questions',
            { body: { date: today } }
          );
          if (!genError && gen?.questions?.length) {
            questionList = gen.questions;
            localStorage.setItem(cacheKey, JSON.stringify(questionList));
          }
        }

        if (!questionList.length) {
          const { data } = await (supabase.rpc as any)('get_daily_questions_for_user', {
            user_uuid: user.id,
          });
          if (Array.isArray(data)) questionList = data;
        }

        const { data: existing } = await supabase
          .from('user_daily_checkins')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', today);

        if (existing && existing.length >= questionList.length && questionList.length > 0) {
          setMessages([
            {
              id: '1',
              text: "🎉 You've already completed today's check-in! Come back tomorrow — I'll have fresh questions for you.",
              isAi: true,
              timestamp: new Date(),
            },
          ]);
          setIsComplete(true);
          return;
        }

        if (questionList.length > 0) {
          setQuestions(questionList);
          setCurrentQuestionIndex(existing?.length || 0);
          const startIdx = existing?.length || 0;
          const first = questionList[startIdx] || questionList[0];
          setMessages([
            {
              id: '1',
              text: `👋 Hi, I'm **Gift** — your AI health companion. Let's do today's check-in together (${startIdx + 1}/${questionList.length}):\n\n${first.question_text}`,
              isAi: true,
              timestamp: new Date(),
            },
          ]);
        } else {
          setMessages([
            {
              id: '1',
              text: "I couldn't load today's questions. Please try again in a moment.",
              isAi: true,
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error: any) {
        console.error('Error loading questions:', error);
        toast({
          title: 'Error',
          description: "Failed to load today's health questions.",
          variant: 'destructive',
        });
      }
    };

    loadDailyQuestions();
  }, []);

  const showTypingIndicator = () => {
    setMessages(prev => [
      ...prev,
      { id: `typing-${Date.now()}`, text: '...', isAi: true, timestamp: new Date(), isTyping: true },
    ]);
  };
  const removeTypingIndicator = () => {
    setMessages(prev => prev.filter(m => !m.isTyping));
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading || questions.length === 0) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: currentMessage,
      isAi: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    showTypingIndicator();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error: saveError } = await supabase
        .from('user_daily_checkins')
        .insert({
          user_id: user.id,
          date: new Date().toISOString().split('T')[0],
          mood: currentMessage,
        } as any);
      if (saveError) throw saveError;

      await (supabase.rpc as any)('update_user_points', {
        user_uuid: user.id,
        points_to_add: 5,
      });

      removeTypingIndicator();

      if (currentQuestionIndex + 1 < questions.length) {
        const nextQuestion = questions[currentQuestionIndex + 1];
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            text: `Thank you for sharing. Here's the next one:\n\n${nextQuestion.question_text}`,
            isAi: true,
            timestamp: new Date(),
          },
        ]);
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        const totalPoints = questions.length * 5;
        setPointsEarned(totalPoints);
        setMessages(prev => [
          ...prev,
          {
            id: `completion-${Date.now()}`,
            text: `🎉 Amazing! You've completed today's check-in and earned **+${totalPoints} points**.\n\nYour answers help me build a picture of your wellness over time.`,
            isAi: true,
            timestamp: new Date(),
          },
        ]);
        setIsComplete(true);
      }
      setCurrentMessage('');
    } catch (error: any) {
      console.error('Error saving answer:', error);
      removeTypingIndicator();
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          text: "I'm having trouble saving that. Please try again.",
          isAi: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessageText = (text: string) => {
    const formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
    return DOMPurify.sanitize(formatted, { ALLOWED_TAGS: ['strong', 'br'], ALLOWED_ATTR: [] });
  };

  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/10">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div
          className="absolute top-1/2 -right-32 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-pulse"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-purple-400/10 blur-3xl animate-pulse"
          style={{ animationDelay: '4s' }}
        />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Back */}
        <Link to={isDoctor ? '/doctor-dashboard' : '/user-dashboard'}>
          <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Hero header */}
        <div className="relative mb-8 sm:mb-10 animate-fade-in">
          <Card className="border-0 overflow-hidden bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground shadow-2xl">
            <CardContent className="p-6 sm:p-10 relative">
              <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-white/30 blur-xl animate-pulse" />
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                    <Brain className="h-10 w-10 sm:h-12 sm:w-12" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 mb-3 text-xs font-medium">
                    <Sparkles className="h-3.5 w-3.5" />
                    Powered by Prescribly AI
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                    Hi, I'm <span className="italic">Gift</span>.
                  </h1>
                  <p className="mt-2 text-primary-foreground/90 text-sm sm:text-base max-w-xl">
                    Your daily AI health companion — checking in, tracking trends, and cheering on your wellness journey.
                  </p>
                </div>
                {pointsEarned > 0 && (
                  <div className="flex items-center gap-2 rounded-2xl bg-amber-400 text-amber-950 px-4 py-3 shadow-lg animate-scale-in font-semibold">
                    <Trophy className="h-5 w-5" />
                    +{pointsEarned} pts
                  </div>
                )}
              </div>

              {/* Stat pills */}
              <div className="relative mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/15 backdrop-blur border border-white/20 p-3">
                  <div className="flex items-center gap-2 text-xs opacity-80"><Heart className="h-3.5 w-3.5" />Today</div>
                  <div className="mt-1 font-bold text-sm sm:text-base">
                    {isComplete ? 'Complete' : `${currentQuestionIndex + 1}/${questions.length || '—'}`}
                  </div>
                </div>
                <div className="rounded-xl bg-white/15 backdrop-blur border border-white/20 p-3">
                  <div className="flex items-center gap-2 text-xs opacity-80"><Flame className="h-3.5 w-3.5" />Streak</div>
                  <div className="mt-1 font-bold text-sm sm:text-base">Keep going</div>
                </div>
                <div className="rounded-xl bg-white/15 backdrop-blur border border-white/20 p-3">
                  <div className="flex items-center gap-2 text-xs opacity-80"><Trophy className="h-3.5 w-3.5" />Reward</div>
                  <div className="mt-1 font-bold text-sm sm:text-base">+5 pts / q</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        {questions.length > 0 && !isComplete && (
          <div className="mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-medium text-foreground">Today's check-in</span>
              <span className="text-muted-foreground">
                {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Chat card */}
        <Card className="border border-border/60 bg-card/80 backdrop-blur-xl shadow-xl rounded-3xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-md">
                <Brain className="h-5 w-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-foreground text-sm sm:text-base">Gift</div>
              <div className="text-xs text-muted-foreground">
                {isComplete ? 'Check-in complete' : 'Online · usually responds instantly'}
              </div>
            </div>
            {isComplete && <CheckCircle className="h-6 w-6 text-green-500" />}
          </div>

          {/* Messages */}
          <div
            ref={scrollAreaRef}
            className="h-[420px] sm:h-[500px] overflow-y-auto px-4 sm:px-6 py-6 space-y-5 bg-gradient-to-b from-background/40 to-primary/5"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isAi ? 'justify-start' : 'justify-end'} animate-fade-in`}
              >
                <div
                  className={`flex items-end gap-2 max-w-[85%] ${
                    message.isAi ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold shadow-sm ${
                      message.isAi
                        ? 'bg-gradient-to-br from-primary to-accent'
                        : 'bg-gradient-to-br from-slate-500 to-slate-700'
                    }`}
                  >
                    {message.isAi ? <Brain className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div
                    className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                      message.isAi
                        ? 'bg-card border border-border rounded-bl-md text-foreground'
                        : 'bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-br-md'
                    }`}
                  >
                    {message.isTyping ? (
                      <div className="flex space-x-1 py-1 px-1">
                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
                        <span
                          className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                          style={{ animationDelay: '0.15s' }}
                        />
                        <span
                          className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                          style={{ animationDelay: '0.3s' }}
                        />
                      </div>
                    ) : (
                      <div
                        className="whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: formatMessageText(message.text) }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border/60 p-3 sm:p-4 bg-card/80 backdrop-blur">
            <div className="flex items-center gap-2 sm:gap-3">
              <Input
                placeholder={
                  isComplete
                    ? 'Come back tomorrow for a new check-in ✨'
                    : 'Type your answer to Gift…'
                }
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading || isComplete}
                className="flex-1 rounded-full border-border/60 bg-background px-5 h-12 focus-visible:ring-primary/40"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !currentMessage.trim() || isComplete}
                size="icon"
                className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25 transition-transform hover:scale-105 active:scale-95"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </Card>

        {isComplete && (
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8 animate-fade-in">
            <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/20">
              <Link to="/health-trends" className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                View Health Trends
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link to="/gamification-profile">
                <Trophy className="h-5 w-5 mr-2" />
                Your Rewards
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIHealthCompanion;
