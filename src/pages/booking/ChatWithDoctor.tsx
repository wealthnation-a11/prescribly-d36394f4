import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { DoctorCard } from '@/components/booking/DoctorCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDoctorAvailability } from '@/hooks/useDoctorAvailability';

interface Doctor {
  user_id: string;
  specialization: string;
  consultation_fee: number;
  profiles: { first_name: string; last_name: string; avatar_url?: string };
}

interface Appointment {
  id: string;
  doctor_id: string;
  scheduled_time: string;
  status: string;
  consultation_fee: number;
  notes?: string;
  created_at: string;
  profiles?: { first_name: string; last_name: string; avatar_url?: string };
}

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30',
];

export default function ChatWithDoctor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const { isTimeSlotAvailable } = useDoctorAvailability(selectedDoctor);

  useEffect(() => {
    fetchDoctors();
    fetchAppointments();
  }, [user]);

  const fetchDoctors = async () => {
    try {
      const { data } = await supabase
        .from('public_doctor_profiles')
        .select('doctor_user_id, specialization, consultation_fee, first_name, last_name, avatar_url');
      setDoctors(
        (data || []).map((d: any) => ({
          user_id: d.doctor_user_id,
          specialization: d.specialization,
          consultation_fee: d.consultation_fee,
          profiles: { first_name: d.first_name || '', last_name: d.last_name || '', avatar_url: d.avatar_url },
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    if (!user) return;
    const { data: appts } = await supabase
      .from('appointments')
      .select('id, doctor_id, scheduled_time, status, consultation_fee, notes, created_at')
      .eq('patient_id', user.id)
      .order('scheduled_time', { ascending: false });

    const doctorIds = [...new Set((appts || []).map((a) => a.doctor_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, avatar_url')
      .in('user_id', doctorIds);
    const profilesMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    setAppointments((appts || []).map((a) => ({ ...a, profiles: profilesMap.get(a.doctor_id) })));
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDoctor || !selectedDate || !selectedTime || !reason.trim()) return;
    setIsBooking(true);
    try {
      const { data, error } = await supabase.functions.invoke('bookAppointment', {
        body: {
          doctor_id: selectedDoctor,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: selectedTime,
          reason: reason.trim(),
          appointment_type: 'clinic',
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: 'Appointment Booked!', description: 'Waiting for doctor approval.' });
      setSelectedDoctor('');
      setSelectedDate(undefined);
      setSelectedTime('');
      setReason('');
      fetchAppointments();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsBooking(false);
    }
  };

  const filteredDoctors = doctors.filter(
    (d) =>
      d.profiles.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.profiles.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingAppointments = appointments.filter((a) => a.status === 'pending');
  const upcomingAppointments = appointments.filter((a) => a.status === 'approved' && !isPast(new Date(a.scheduled_time)));
  const historyAppointments = appointments.filter(
    (a) => a.status === 'completed' || a.status === 'cancelled' || (a.status === 'approved' && isPast(new Date(a.scheduled_time)))
  );

  const selectedDoctorData = doctors.find((d) => d.user_id === selectedDoctor);

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
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <Tabs defaultValue="book" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="book">Book New</TabsTrigger>
                <TabsTrigger value="pending">Pending {pendingAppointments.length > 0 && `(${pendingAppointments.length})`}</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming {upcomingAppointments.length > 0 && `(${upcomingAppointments.length})`}</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="book">
                {!selectedDoctor ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search doctors by name or specialty..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                    {loading ? (
                      <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
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
                            price={d.consultation_fee}
                            onSelect={() => setSelectedDoctor(d.user_id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedDoctor('')}>
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <CardTitle>Book with Dr. {selectedDoctorData?.profiles.first_name} {selectedDoctorData?.profiles.last_name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleBook} className="space-y-4">
                        <div>
                          <Label>Select Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn('w-full justify-start text-left', !selectedDate && 'text-muted-foreground')}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} /></PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label>Select Time</Label>
                          <Select value={selectedTime} onValueChange={setSelectedTime}>
                            <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                            <SelectContent>
                              {timeSlots.map((t) => (
                                <SelectItem key={t} value={t} disabled={selectedDate ? !isTimeSlotAvailable(selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(), t) : false}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Reason for Visit</Label>
                          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe your reason..." required maxLength={1000} />
                        </div>
                        <Button type="submit" className="w-full" disabled={isBooking || !selectedDate || !selectedTime || !reason.trim()}>
                          {isBooking ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Booking...</> : 'Book Appointment'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="pending">
                {pendingAppointments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No pending appointments</p>
                ) : (
                  <div className="space-y-3">
                    {pendingAppointments.map((a) => (
                      <Card key={a.id}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <Clock className="h-5 w-5 text-orange-500" />
                          <div className="flex-1">
                            <p className="font-medium">Dr. {a.profiles?.first_name} {a.profiles?.last_name}</p>
                            <p className="text-sm text-muted-foreground">{format(new Date(a.scheduled_time), 'PPP p')}</p>
                          </div>
                          <Badge variant="secondary">Pending</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="upcoming">
                {upcomingAppointments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No upcoming appointments</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingAppointments.map((a) => (
                      <Card key={a.id}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <CheckCircle className="h-5 w-5 text-teal-500" />
                          <div className="flex-1">
                            <p className="font-medium">Dr. {a.profiles?.first_name} {a.profiles?.last_name}</p>
                            <p className="text-sm text-muted-foreground">{format(new Date(a.scheduled_time), 'PPP p')}</p>
                          </div>
                          <Button size="sm" onClick={() => navigate('/chat', { state: { doctorId: a.doctor_id } })}>
                            <MessageCircle className="h-4 w-4 mr-1" /> Chat
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history">
                {historyAppointments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No appointment history</p>
                ) : (
                  <div className="space-y-3">
                    {historyAppointments.map((a) => (
                      <Card key={a.id}>
                        <CardContent className="p-4 flex items-center gap-4">
                          {a.status === 'completed' ? <CheckCircle className="h-5 w-5 text-blue-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                          <div className="flex-1">
                            <p className="font-medium">Dr. {a.profiles?.first_name} {a.profiles?.last_name}</p>
                            <p className="text-sm text-muted-foreground">{format(new Date(a.scheduled_time), 'PPP p')}</p>
                          </div>
                          <Badge variant={a.status === 'completed' ? 'default' : 'destructive'}>{a.status}</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
