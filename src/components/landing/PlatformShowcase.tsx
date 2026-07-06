import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Flower2,
  Trophy,
  Lock,
  Home,
  TrendingUp,
  Stethoscope,
  MessageCircle,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Gift — Your AI Health Companion",
    desc: "A daily check-in with an AI that learns your health rhythms, tracks mood, and celebrates streaks.",
    gradient: "from-purple-500/20 via-fuchsia-500/10 to-pink-500/10",
    accent: "text-purple-600 dark:text-purple-300",
    tag: "AI",
  },
  {
    icon: Stethoscope,
    title: "Instant Doctor Consultations",
    desc: "Chat, voice or video with a licensed doctor in minutes — from just ₦3,500.",
    gradient: "from-sky-500/20 via-cyan-500/10 to-blue-500/10",
    accent: "text-sky-600 dark:text-sky-300",
    tag: "24/7",
  },
  {
    icon: Home,
    title: "Doctor Home Visits",
    desc: "Book a verified doctor to come to you — geo-matched within a 25-mile radius.",
    gradient: "from-emerald-500/20 via-teal-500/10 to-green-500/10",
    accent: "text-emerald-600 dark:text-emerald-300",
    tag: "New",
  },
  {
    icon: Flower2,
    title: "Women's Health Suite",
    desc: "Cycle tracking, fertility windows, pregnancy journey and a private Secret Chat vault.",
    gradient: "from-pink-500/20 via-rose-500/10 to-red-500/10",
    accent: "text-pink-600 dark:text-pink-300",
    tag: "For Her",
  },
  {
    icon: Trophy,
    title: "Health Challenges & Points",
    desc: "Hydration, steps, sleep, mindfulness & medication streaks — earn points and level up.",
    gradient: "from-amber-500/20 via-orange-500/10 to-yellow-500/10",
    accent: "text-amber-600 dark:text-amber-300",
    tag: "Gamified",
  },
  {
    icon: TrendingUp,
    title: "Health Trends Dashboard",
    desc: "Beautiful visualizations of your vitals, moods and progress over time.",
    gradient: "from-indigo-500/20 via-violet-500/10 to-blue-500/10",
    accent: "text-indigo-600 dark:text-indigo-300",
    tag: "Insights",
  },
  {
    icon: Lock,
    title: "PIN-Protected Secret Chats",
    desc: "A private, encrypted vault for sensitive conversations — only you have the key.",
    gradient: "from-slate-500/20 via-zinc-500/10 to-neutral-500/10",
    accent: "text-slate-700 dark:text-slate-200",
    tag: "Private",
  },
  {
    icon: MessageCircle,
    title: "Real-time Messaging",
    desc: "Direct chat with your doctor after every appointment, with prescriptions attached.",
    gradient: "from-blue-500/20 via-sky-500/10 to-cyan-500/10",
    accent: "text-blue-600 dark:text-blue-300",
    tag: "Live",
  },
];

export const PlatformShowcase = () => {
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      {/* Animated backdrop */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 -right-24 w-96 h-96 rounded-full bg-accent/10 blur-3xl animate-pulse"
          style={{ animationDelay: "1.5s" }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-5 fade-in-up">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-primary">
              Everything you get inside Prescribly
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground fade-in-up stagger-1">
            One app.{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Your whole health, in your pocket.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground fade-in-up stagger-2">
            From an AI companion that checks in with you daily, to doctors that come to your door —
            these are the tools our members use every day.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {features.map((f, i) => (
            <Card
              key={f.title}
              className={`group relative overflow-hidden border border-border/50 bg-card p-6 rounded-2xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 fade-in-up`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-500`}
              />
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`h-11 w-11 rounded-xl bg-background/70 backdrop-blur flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500 ${f.accent}`}
                  >
                    <f.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-background/70 text-foreground/70 backdrop-blur">
                    {f.tag}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground text-base sm:text-lg leading-snug mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 sm:mt-16 flex flex-col sm:flex-row items-center justify-center gap-4 fade-in-up">
          <Button size="lg" variant="cta" className="button-enhanced px-8" asChild>
            <Link to="/register">Create your free account</Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            No subscription. Pay only when you book.
          </span>
        </div>
      </div>
    </section>
  );
};

export default PlatformShowcase;
