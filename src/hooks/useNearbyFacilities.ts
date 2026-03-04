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
        const { data, error: rpcError } = await supabase.rpc('nearby_facilities', {
          user_lat: lat,
          user_lon: lng,
          radius_miles: radiusMiles,
          facility_type: facilityType,
        });

        if (rpcError) throw rpcError;

        if (!data || data.length === 0) {
          setFacilities([]);
          return;
        }

        const facilityIds = data.map((f: any) => f.facility_id);
        const distanceMap = new Map(data.map((f: any) => [f.facility_id, f.distance_miles]));

        const { data: facilityData } = await supabase
          .from('facilities')
          .select('id, name, type, address, city, state, phone, description, logo_url')
          .in('id', facilityIds);

        const enriched: NearbyFacility[] = (facilityData || []).map((f: any) => ({
          ...f,
          distance_miles: distanceMap.get(f.id) || 0,
        }));

        enriched.sort((a, b) => a.distance_miles - b.distance_miles);
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
