import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function HomeVisit() {
  const navigate = useNavigate();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1">
          <header className="h-16 flex items-center border-b bg-background/95 backdrop-blur">
            <SidebarTrigger className="ml-4" />
            <Button variant="ghost" size="icon" className="ml-2" onClick={() => navigate('/book-appointment')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="ml-2 text-xl font-semibold">Home Visit</h1>
          </header>
          <div className="container mx-auto px-4 py-10 max-w-md">
            <Card className="p-8 text-center space-y-5 border-0 shadow-lg">
              <div className="flex justify-center"><Logo size="lg" priority /></div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mx-auto">
                <Sparkles className="h-3.5 w-3.5" /> Coming Soon
              </div>
              <h2 className="text-2xl font-bold">Home Visits are on the way</h2>
              <p className="text-sm text-muted-foreground">
                We're putting the final touches on our doctor home-visit service so a verified
                Prescribly doctor can come to your address. You'll be the first to know once it
                goes live.
              </p>
              <Button className="w-full" onClick={() => navigate('/book-appointment')}>
                Back to Booking Options
              </Button>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
