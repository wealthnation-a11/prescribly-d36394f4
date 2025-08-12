import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar as CalendarIcon, Clock, UserCog, Loader2, MessageCircle, CheckCircle, XCircle, History } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { formatNGNAsUSD } from '@/utils/currency';
import ActivityLog from '@/components/ActivityLog';

interface Doctor {
  user_id: string;
  specialization: string;
  consultation_fee: number;
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_time: string;
  duration_minutes: number;
  status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'scheduled' | 'no_show';
  consultation_fee: number;
  notes?: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30'
];

export default function BookAppointment() {
  const { user } = useAuth();
  const { logAppointmentBooked } = useActivityLogger();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { exchangeRate } = useExchangeRate();
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchDoctors();
    fetchAppointments();
    
    // Subscribe to appointment changes for real-time updates
    const appointmentsChannel = supabase
      .channel('patient-appointment-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${user.id}`
        },
        () => {
          // Refetch appointments when they change
          fetchAppointments();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(appointmentsChannel);
    };
  }, [user, navigate]);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('public_doctor_profiles')
        .select('doctor_user_id, specialization, consultation_fee, first_name, last_name, avatar_url');

      if (error) throw error;

      const doctorsWithProfiles = (data || []).map((doc: any) => ({
        user_id: doc.doctor_user_id,
        specialization: doc.specialization,
        consultation_fee: doc.consultation_fee,
        profiles: {
          first_name: doc.first_name || '',
          last_name: doc.last_name || '',
          avatar_url: doc.avatar_url || ''
        }
      }));

      setDoctors(doctorsWithProfiles as Doctor[]);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: "Error",
        description: "Failed to load doctors. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      // First get appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          doctor_id,
          scheduled_time,
          duration_minutes,
          status,
          consultation_fee,
          notes,
          created_at
        `)
        .eq('patient_id', user?.id)
        .order('scheduled_time', { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Then get doctor profiles for each appointment
      const appointmentsWithProfiles = await Promise.all(
        (appointmentsData || []).map(async (appointment) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('user_id', appointment.doctor_id)
            .single();

          return {
            ...appointment,
            profiles: profileData
          };
        })
      );
      
      setAppointments(appointmentsWithProfiles as Appointment[]);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate user session
    if (!user?.id) {
      toast({
        title: "Session Expired",
        description: "Please log in again to book an appointment.",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }
    
    if (!selectedDoctor || !selectedDate || !selectedTime || !reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Additional validation - check if date is in the past
    if (selectedDate && selectedDate < new Date(new Date().setHours(0, 0, 0, 0))) {
      toast({
        title: "Invalid Date",
        description: "Cannot book appointments for past dates.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Booking appointment with:', {
        doctor_id: selectedDoctor,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        reason: reason.trim(),
        patient_id: user.id
      });

      const { data, error } = await supabase.functions.invoke('bookAppointment', {
        body: {
          doctor_id: selectedDoctor,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: selectedTime,
          reason: reason.trim()
        }
      });

      console.log('Booking response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.error) {
        toast({
          title: "Booking Failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      // Success!
      toast({
        title: "Appointment Booked!",
        description: data?.message || "Appointment booked successfully! Waiting for doctor approval to enable chat.",
      });

      // Log the appointment booking activity
      const selectedDoctorData = doctors.find(d => d.user_id === selectedDoctor);
      if (selectedDoctorData) {
        logAppointmentBooked(
          `${selectedDoctorData.profiles.first_name} ${selectedDoctorData.profiles.last_name}`,
          format(selectedDate!, 'PPP') + ' at ' + selectedTime
        );
      }

      // Set up real-time subscription for appointment status updates
      const statusChannel = supabase
        .channel('appointment-status-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'appointments',
            filter: `patient_id=eq.${user.id}`
          },
          (payload) => {
            const updatedAppointment = payload.new;
            if (updatedAppointment.status === 'cancelled') {
              toast({
                title: "Appointment Declined",
                description: "Your appointment request has been declined by the doctor.",
                variant: "destructive",
              });
            } else if (updatedAppointment.status === 'approved') {
              toast({
                title: "Appointment Approved",
                description: "Your appointment has been approved! You can now chat with the doctor.",
              });
            }
            // Refresh appointments list
            fetchAppointments();
          }
        )
        .subscribe();

      // Cleanup subscription after a delay
      setTimeout(() => {
        supabase.removeChannel(statusChannel);
      }, 30000);

      // Reset form
      setSelectedDoctor('');
      setSelectedDate(undefined);
      setSelectedTime('');
      setReason('');
      
      // Refresh appointments and redirect to pending tab
      await fetchAppointments();
      
      // Switch to pending tab to show the new appointment
      const pendingTab = document.querySelector('[value="pending"]') as HTMLElement;
      if (pendingTab) {
        pendingTab.click();
      }
      
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      
      // Handle specific error types
      let errorMessage = "Unable to book appointment. Please try again.";
      
      if (error?.message?.includes('Failed to fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error?.message?.includes('unauthorized') || error?.message?.includes('401')) {
        errorMessage = "Session expired. Please log in again.";
        navigate('/login');
        return;
      }
      
      toast({
        title: "Booking Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = selectedDoctor && selectedDate && selectedTime && reason.trim();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-teal-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-teal-100 text-teal-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const canChat = (appointment: Appointment) => {
    return appointment.status === 'approved' || appointment.status === 'completed';
  };

  const pendingAppointments = appointments.filter(app => app.status === 'pending');
  const upcomingAppointments = appointments.filter(app => 
    (app.status === 'approved') && !isPast(new Date(app.scheduled_time))
  );
  const appointmentHistory = appointments.filter(app => 
    app.status === 'completed' || app.status === 'cancelled' || 
    (app.status === 'approved' && isPast(new Date(app.scheduled_time)))
  );

  if (isLoadingDoctors || isLoadingAppointments) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1">
            <header className="h-16 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <SidebarTrigger className="ml-4" />
              <h1 className="ml-4 text-xl font-semibold">Book Appointment</h1>
            </header>
            <div className="container mx-auto px-4 py-8">
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1">
          <header className="h-16 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="ml-4" />
            <h1 className="ml-4 text-xl font-semibold">Book Appointment</h1>
          </header>
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground mb-2">Appointments</h1>
              <p className="text-muted-foreground">Manage your appointments and consultations</p>
            </div>

            <Tabs defaultValue="book" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="book">Book New</TabsTrigger>
                <TabsTrigger value="pending">
                  Pending {pendingAppointments.length > 0 && `(${pendingAppointments.length})`}
                </TabsTrigger>
                <TabsTrigger value="upcoming">
                  Upcoming {upcomingAppointments.length > 0 && `(${upcomingAppointments.length})`}
                </TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="book">
                <Card className="shadow-lg border-medical-blue/10">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-medical-blue">
                      <UserCog className="h-5 w-5" />
                      Book New Appointment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Doctor Selection */}
                      <div className="space-y-2">
                        <Label htmlFor="doctor" className="text-sm font-medium">Select Doctor</Label>
                        <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                          <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder="Choose a doctor" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            {doctors.map((doctor) => (
                              <SelectItem key={doctor.user_id} value={doctor.user_id}>
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">
                                    Dr. {doctor.profiles.first_name} {doctor.profiles.last_name}
                                  </span>
                                   <span className="text-sm text-muted-foreground">
                                     {doctor.specialization} • {formatNGNAsUSD(doctor.consultation_fee, exchangeRate)}
                                   </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Date Selection */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Select Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-12 justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-background" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              disabled={(date) =>
                                date < new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Time Selection */}
                      <div className="space-y-2">
                        <Label htmlFor="time" className="text-sm font-medium">Select Time</Label>
                        <Select value={selectedTime} onValueChange={setSelectedTime}>
                          <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder="Choose a time slot" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            {timeSlots.map((time) => (
                              <SelectItem key={time} value={time}>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {time}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Reason for Appointment */}
                      <div className="space-y-2">
                        <Label htmlFor="reason" className="text-sm font-medium">Reason for Appointment</Label>
                        <Textarea
                          id="reason"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Please describe your symptoms or reason for the consultation..."
                          className="min-h-[100px] text-base"
                          required
                        />
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        disabled={!isFormValid || isLoading}
                        className="w-full h-12 text-base font-semibold"
                        variant="medical"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Booking...
                          </>
                        ) : (
                          'Send Request'
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pending">
                <div className="space-y-4">
                  {pendingAppointments.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8">
                        <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No pending appointments</p>
                      </CardContent>
                    </Card>
                  ) : (
                    pendingAppointments.map((appointment) => (
                      <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={appointment.profiles?.avatar_url} />
                                <AvatarFallback>
                                  {appointment.profiles?.first_name?.[0]}{appointment.profiles?.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  Dr. {appointment.profiles?.first_name} {appointment.profiles?.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(appointment.scheduled_time), "PPP 'at' p")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(appointment.status)}
                              <Badge className={getStatusColor(appointment.status)}>
                                {appointment.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="upcoming">
                <div className="space-y-4">
                  {upcomingAppointments.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No upcoming appointments</p>
                      </CardContent>
                    </Card>
                  ) : (
                    upcomingAppointments.map((appointment) => (
                      <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={appointment.profiles?.avatar_url} />
                                <AvatarFallback>
                                  {appointment.profiles?.first_name?.[0]}{appointment.profiles?.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  Dr. {appointment.profiles?.first_name} {appointment.profiles?.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(appointment.scheduled_time), "PPP 'at' p")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(appointment.status)}
                              <Badge className={getStatusColor(appointment.status)}>
                                {appointment.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="history">
                <div className="space-y-4">
                  {appointmentHistory.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8">
                        <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No appointment history</p>
                      </CardContent>
                    </Card>
                  ) : (
                    appointmentHistory.map((appointment) => (
                      <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={appointment.profiles?.avatar_url} />
                                <AvatarFallback>
                                  {appointment.profiles?.first_name?.[0]}{appointment.profiles?.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  Dr. {appointment.profiles?.first_name} {appointment.profiles?.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(appointment.scheduled_time), "PPP 'at' p")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {canChat(appointment) && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => navigate('/chat')}
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  Chat Now
                                </Button>
                              )}
                              {getStatusIcon(appointment.status)}
                              <Badge className={getStatusColor(appointment.status)}>
                                {appointment.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}