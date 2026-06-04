import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { DoctorCard } from '@/components/booking/DoctorCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft, Search, CheckCircle2, Sparkles, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConsultationPayment } from '@/hooks/useConsultationPayment';
import { Logo } from '@/components/Logo';

interface Doctor {
  user_id: string;
  specialization: string;
  consultation_fee: number;
  profiles: { first_name: string; last_name: string; avatar_url?: string };
}

export default function ChatWithDoctor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { initializePayment, loading: payLoading } = useConsultationPayment();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('doctors')
        .select('user_id, specialization, consultation_fee')
        .eq('verification_status', 'approved');
      const userIds = (data || []).map((d: any) => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', userIds);
      const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setDoctors(
        (data || []).map((d: any) => {
          const p: any = pMap.get(d.user_id) || {};
          return {
            user_id: d.user_id,
            specialization: d.specialization,
            consultation_fee: d.consultation_fee,
            profiles: {
              first_name: p.first_name || '',
              last_name: p.last_name || '',
              avatar_url: p.avatar_url,
            },
          };
        })
      );
      setLoading(false);
    })();
  }, [user]);

  const handlePay = async () => {
    if (!selectedDoctor || !user) return;
    setPaying(true);
    try {
      // Use the doctor's user_id as the payment reference (lightweight "session" id)
      const ref = `consult_${selectedDoctor.user_id}_${Date.now()}`;
      const url = await initializePayment(ref);
      if (url) {
        localStorage.setItem(
          'consultation_payment_callback',
          JSON.stringify({
            appointmentId: ref,
            action: 'consultation_external_redirect',
            doctorId: selectedDoctor.user_id,
            doctorName: `${selectedDoctor.profiles.first_name} ${selectedDoctor.profiles.last_name}`,
          })
        );
        window.location.href = url;
      }
    } catch (err: any) {
      toast({ title: 'Payment failed', description: err.message, variant: 'destructive' });
    } finally {
      setPaying(false);
    }
  };

  const filteredDoctors = doctors.filter(
    (d) =>
      d.profiles.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.profiles.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h1 className="ml-2 text-xl font-semibold">Chat or Call a Doctor</h1>
          </header>
          <div className="container mx-auto px-4 py-6 max-w-2xl">
            {!selectedDoctor ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search doctors by name or specialty..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredDoctors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No doctors found</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filteredDoctors.map((d) => (
                      <DoctorCard
                        key={d.user_id}
                        name={`${d.profiles.first_name} ${d.profiles.last_name}`}
                        specialization={d.specialization}
                        avatarUrl={d.profiles.avatar_url}
                        price={3000}
                        priceLabel="Consultation Fee"
                        onSelect={() => setSelectedDoctor(d)}
                        buttonText="Consult Now"
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Card className="p-6 space-y-5 text-center">
                <div className="flex justify-center"><Logo size="lg" priority /></div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mx-auto">
                  <Sparkles className="h-3.5 w-3.5" /> Secure consultation
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">You're about to consult with</p>
                  <h2 className="text-xl font-bold mt-1">
                    Dr. {selectedDoctor.profiles.first_name} {selectedDoctor.profiles.last_name}
                  </h2>
                  <p className="text-xs text-muted-foreground">{selectedDoctor.specialization}</p>
                </div>

                <div className="rounded-xl bg-muted/40 p-4 text-left space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Consultation Fee</span>
                    <span className="font-bold text-primary text-base">₦3,000</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                      Pay securely through Prescribly
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                      After payment you'll be redirected to start your consultation
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                      Chat, voice, or video — all from inside Prescribly
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedDoctor(null)} disabled={paying || payLoading}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={handlePay} disabled={paying || payLoading}>
                    {paying || payLoading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                    ) : (
                      <><CreditCard className="h-4 w-4 mr-2" />Pay ₦3,000</>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Secure payment powered by Flutterwave
                </p>
              </Card>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
