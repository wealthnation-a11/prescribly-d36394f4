import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MessageCircle, Home, Building2, Video, ArrowRight } from 'lucide-react';

const modes = [
  {
    title: 'Chat or Call a Doctor',
    description: 'Connect with a doctor instantly via chat, audio, or video call',
    icon: <div className="flex gap-1"><MessageCircle className="h-8 w-8" /><Video className="h-8 w-8" /></div>,
    path: '/book-appointment/chat',
    gradient: 'from-blue-500/20 to-cyan-500/20 dark:from-blue-500/10 dark:to-cyan-500/10',
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800/50',
  },
  {
    title: 'Home Visit',
    description: 'A doctor visits you at home within your area',
    icon: <Home className="h-8 w-8" />,
    path: '/book-appointment/home-visit',
    gradient: 'from-emerald-500/20 to-teal-500/20 dark:from-emerald-500/10 dark:to-teal-500/10',
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800/50',
  },
  {
    title: 'Clinic / Hospital / Pharmacy',
    description: 'Visit a nearby facility with a unique registration code',
    icon: <Building2 className="h-8 w-8" />,
    path: '/book-appointment/facility',
    gradient: 'from-violet-500/20 to-purple-500/20 dark:from-violet-500/10 dark:to-purple-500/10',
    iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800/50',
  },
];

export default function BookingModeSelector() {
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1">
          <header className="h-16 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="ml-4" />
            <h1 className="ml-4 text-xl font-semibold">Book Appointment</h1>
          </header>
          <div className="container mx-auto px-4 py-8 max-w-2xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground">How would you like to see a doctor?</h2>
              <p className="text-muted-foreground mt-2">Choose the option that works best for you</p>
            </div>
            <div className="space-y-4">
              {modes.map((mode) => (
                <button
                  key={mode.path}
                  onClick={() => navigate(mode.path)}
                  className={`w-full group relative rounded-2xl border ${mode.border} bg-gradient-to-br ${mode.gradient} p-6 text-left transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.99]`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`rounded-xl p-3 ${mode.iconBg}`}>{mode.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground">{mode.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{mode.description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
