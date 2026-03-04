import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Loader2 } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { useBrowserGeolocation } from '@/hooks/useBrowserGeolocation';
import { useNearbyFacilities } from '@/hooks/useNearbyFacilities';

export const NearbyHospitals = () => {
  const navigate = useNavigate();
  const { coords, loading: geoLoading } = useBrowserGeolocation();
  const { facilities, loading: facilitiesLoading } = useNearbyFacilities(
    coords?.latitude ?? null,
    coords?.longitude ?? null,
    'hospital'
  );
  const [emblaRef] = useEmblaCarousel({ loop: false, align: 'start', dragFree: true });

  const loading = geoLoading || facilitiesLoading;

  if (!loading && facilities.length === 0) return null;

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center text-foreground mb-4 fade-in-up">
          Hospitals Near You
        </h2>
        <p className="text-center text-muted-foreground mb-12 fade-in-up">
          Find and book appointments at hospitals in your area
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {facilities.map((facility) => (
                <div key={facility.id} className="flex-[0_0_300px] min-w-0">
                  <Card className="p-6 h-full border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {facility.logo_url ? (
                          <img src={facility.logo_url} alt={facility.name} className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <Building2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{facility.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{facility.distance_miles.toFixed(1)} miles away</span>
                        </div>
                      </div>
                    </div>
                    {facility.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{facility.description}</p>
                    )}
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => navigate('/book-appointment/facility')}
                    >
                      Book Now
                    </Button>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
