import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { DoctorCard } from '@/components/booking/DoctorCard';
import { MedicalIntakeForm } from '@/components/booking/MedicalIntakeForm';
import { useBrowserGeolocation } from '@/hooks/useBrowserGeolocation';
import { useNearbyDoctors } from '@/hooks/useNearbyDoctors';
import { ArrowLeft, Loader2, MapPin, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function HomeVisit() {
  const navigate = useNavigate();
  const { coords, loading: geoLoading, error: geoError } = useBrowserGeolocation();
  const { doctors, loading: doctorsLoading, error: doctorsError } = useNearbyDoctors(
    coords?.latitude ?? null,
    coords?.longitude ?? null
  );
  const [selectedDoctor, setSelectedDoctor] = useState<typeof doctors[0] | null>(null);

  const loading = geoLoading || doctorsLoading;

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
          <div className="container mx-auto px-4 py-6 max-w-2xl">
            {selectedDoctor ? (
              <MedicalIntakeForm
                doctorName={`${selectedDoctor.first_name} ${selectedDoctor.last_name}`}
                doctorUserId={selectedDoctor.doctor_user_id}
                userAddress=""
                userLat={coords?.latitude ?? null}
                userLng={coords?.longitude ?? null}
                onBack={() => setSelectedDoctor(null)}
                onSuccess={() => navigate('/book-appointment')}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {geoLoading ? 'Detecting your location...' : geoError ? 'Location unavailable' : 'Showing doctors within 25 miles'}
                </div>

                {geoError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please enable location access to find nearby doctors. {geoError}
                    </AlertDescription>
                  </Alert>
                )}

                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : doctors.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No doctors offering home visits found nearby.</p>
                    <p className="text-sm text-muted-foreground mt-1">Try expanding your search area or check back later.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {doctors.map((d) => (
                      <DoctorCard
                        key={d.doctor_user_id}
                        name={`${d.first_name} ${d.last_name}`}
                        specialization={d.specialization}
                        avatarUrl={d.avatar_url}
                        rating={d.rating}
                        price={d.home_service_fee}
                        priceLabel="Home Visit Fee"
                        distanceMiles={d.distance_miles}
                        onSelect={() => setSelectedDoctor(d)}
                        buttonText="Request Home Visit"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
