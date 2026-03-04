import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { FacilityCard } from '@/components/booking/FacilityCard';
import { RegistrationCodeDisplay } from '@/components/booking/RegistrationCodeDisplay';
import { useBrowserGeolocation } from '@/hooks/useBrowserGeolocation';
import { useNearbyFacilities, NearbyFacility } from '@/hooks/useNearbyFacilities';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, MapPin, AlertCircle, Building2, Stethoscope, Pill } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const filters = [
  { value: null as string | null, label: 'All', icon: Building2 },
  { value: 'hospital', label: 'Hospitals', icon: Building2 },
  { value: 'clinic', label: 'Clinics', icon: Stethoscope },
  { value: 'pharmacy', label: 'Pharmacies', icon: Pill },
];

export default function FacilityVisit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { coords, loading: geoLoading, error: geoError } = useBrowserGeolocation();
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const { facilities, loading: facilitiesLoading } = useNearbyFacilities(
    coords?.latitude ?? null,
    coords?.longitude ?? null,
    typeFilter
  );
  const [generatedCode, setGeneratedCode] = useState<{ code: string; facilityName: string; expiresAt: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  const loading = geoLoading || facilitiesLoading;

  const handleSelectFacility = async (facility: NearbyFacility) => {
    if (!user) return;
    setGenerating(true);
    try {
      const code = crypto.randomUUID().slice(0, 6).toUpperCase();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const qrData = JSON.stringify({ code, facility_id: facility.id, patient_id: user.id });

      const { error } = await supabase.from('registration_codes').insert({
        patient_id: user.id,
        facility_id: facility.id,
        code,
        qr_data: qrData,
        expires_at: expiresAt,
      });

      if (error) throw error;
      setGeneratedCode({ code, facilityName: facility.name, expiresAt });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate code.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

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
            <h1 className="ml-2 text-xl font-semibold">Clinic / Hospital / Pharmacy</h1>
          </header>
          <div className="container mx-auto px-4 py-6 max-w-2xl">
            {generatedCode ? (
              <RegistrationCodeDisplay
                code={generatedCode.code}
                facilityName={generatedCode.facilityName}
                expiresAt={generatedCode.expiresAt}
                onDone={() => navigate('/book-appointment')}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {geoLoading ? 'Detecting your location...' : geoError ? 'Location unavailable' : 'Showing facilities within 25 miles'}
                </div>

                {geoError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Please enable location access. {geoError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 flex-wrap">
                  {filters.map((f) => (
                    <Button
                      key={f.label}
                      variant={typeFilter === f.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTypeFilter(f.value)}
                      className="rounded-full"
                    >
                      <f.icon className="h-3.5 w-3.5 mr-1.5" />
                      {f.label}
                    </Button>
                  ))}
                </div>

                {loading || generating ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : facilities.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No facilities found nearby.</p>
                    <p className="text-sm text-muted-foreground mt-1">Try changing the filter or check back later.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {facilities.map((f) => (
                      <FacilityCard
                        key={f.id}
                        name={f.name}
                        type={f.type}
                        address={f.address}
                        city={f.city}
                        phone={f.phone}
                        description={f.description}
                        logoUrl={f.logo_url}
                        distanceMiles={f.distance_miles}
                        onSelect={() => handleSelectFacility(f)}
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
