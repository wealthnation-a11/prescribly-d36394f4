import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Search, Calendar, MapPin, Award, Briefcase, MessageCircle } from 'lucide-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileHeader } from '@/components/MobileHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function FindPractitioners() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPractitioner, setSelectedPractitioner] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const { user } = useAuth();

  const handleBookConsultation = async () => {
    if (!user || !selectedPractitioner) return;
    
    if (!bookingDate || !bookingTime) {
      toast.error('Please select a date and time');
      return;
    }

    const scheduledTime = `${bookingDate}T${bookingTime}:00`;
    
    const { error } = await supabase
      .from('herbal_consultations')
      .insert({
        practitioner_id: selectedPractitioner.id,
        patient_id: user.id,
        scheduled_time: scheduledTime,
        notes: bookingNotes,
        status: 'scheduled',
      });

    if (error) {
      toast.error('Failed to book consultation');
      return;
    }

    toast.success('Consultation booked successfully!');
    setSelectedPractitioner(null);
    setBookingDate('');
    setBookingTime('');
    setBookingNotes('');
  };

  const { data: practitioners, isLoading } = useQuery({
    queryKey: ['approved-practitioners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('herbal_practitioners')
        .select('*')
        .eq('verification_status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredPractitioners = practitioners?.filter((practitioner) =>
    practitioner.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    practitioner.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    practitioner.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
    practitioner.practice_location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <MobileHeader title="Find Practitioners" />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Herbal Practitioners</h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Connect with certified herbal medicine experts
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, specialization, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 sm:h-10"
                />
              </div>

              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))
                ) : filteredPractitioners?.length === 0 ? (
                  <div className="col-span-full">
                    <Card>
                      <CardContent className="p-8 sm:p-12 text-center">
                        <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm sm:text-base text-muted-foreground">
                          {searchQuery ? 'No practitioners found matching your search' : 'No practitioners available yet'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  filteredPractitioners?.map((practitioner) => (
                    <Card key={practitioner.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="px-4 sm:px-6">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base sm:text-lg">
                              {practitioner.first_name} {practitioner.last_name}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm flex items-center gap-1 mt-1">
                              <Award className="h-3 w-3 flex-shrink-0" />
                              {practitioner.specialization}
                            </CardDescription>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100 flex-shrink-0 text-xs">
                            Verified
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 sm:px-6">
                        {practitioner.years_of_experience && (
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            {practitioner.years_of_experience} years experience
                          </div>
                        )}
                        {practitioner.practice_location && (
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            {practitioner.practice_location}
                          </div>
                        )}
                        {practitioner.bio && (
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 mt-2">
                            {practitioner.bio}
                          </p>
                        )}
                        <div className="flex gap-2 mt-4">
                          <Button 
                            className="flex-1 gap-2 h-10 sm:h-9 text-sm"
                            onClick={() => setSelectedPractitioner(practitioner)}
                          >
                            <Calendar className="h-4 w-4" />
                            Book Consultation
                          </Button>
                          <Button variant="outline" size="icon" className="h-10 sm:h-9 w-10 sm:w-9 flex-shrink-0">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>

      <Dialog open={!!selectedPractitioner} onOpenChange={() => setSelectedPractitioner(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book Consultation</DialogTitle>
            <DialogDescription>
              Schedule a consultation with {selectedPractitioner?.first_name} {selectedPractitioner?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Date</label>
              <Input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Time</label>
              <Input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes (Optional)</label>
              <Input
                placeholder="Any specific concerns or questions..."
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedPractitioner(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleBookConsultation}>
                Confirm Booking
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
