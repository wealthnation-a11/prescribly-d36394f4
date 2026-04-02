import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NearbyFacility {
  id: string;
  name: string;
  type: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  description: string | null;
  logo_url: string | null;
  distance_miles: number;
}

export const useNearbyFacilities = (
  lat: number | null,
  lng: number | null,
  facilityType: string | null = null,
  radiusMiles = 25
) => {
  const [facilities, setFacilities] = useState<NearbyFacility[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lat === null || lng === null) return;

    const fetchFacilities = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch facilities and calculate distance client-side
        let query = supabase
          .from('facilities')
          .select('id, name, facility_type, address, city, state, phone, latitude, longitude')
          .eq('is_verified', true);

        if (facilityType) {
          query = query.eq('facility_type', facilityType);
        }

        const { data: facilityData, error: facError } = await query;
        if (facError) throw facError;

        if (!facilityData || facilityData.length === 0) {
          setFacilities([]);
          return;
        }

        const toRad = (deg: number) => deg * Math.PI / 180;
        const calcDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 3959;
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        };

        const enriched: NearbyFacility[] = facilityData
          .filter(f => f.latitude && f.longitude)
          .map(f => ({
            id: f.id,
            name: f.name,
            type: f.facility_type || 'hospital',
            address: f.address,
            city: f.city,
            state: f.state,
            phone: f.phone,
            description: null,
            logo_url: null,
            distance_miles: calcDist(lat!, lng!, f.latitude!, f.longitude!),
          }))
          .filter(f => f.distance_miles <= radiusMiles)
          .sort((a, b) => a.distance_miles - b.distance_miles);

        setFacilities(enriched);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch nearby facilities');
      } finally {
        setLoading(false);
      }
    };

    fetchFacilities();
  }, [lat, lng, facilityType, radiusMiles]);

  return { facilities, loading, error };
};
