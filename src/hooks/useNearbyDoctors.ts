import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NearbyDoctor {
  doctor_user_id: string;
  distance_miles: number;
  first_name: string;
  last_name: string;
  specialization: string;
  avatar_url: string | null;
  rating: number | null;
  home_service_fee: number | null;
  consultation_fee: number | null;
  bio: string | null;
}

export const useNearbyDoctors = (lat: number | null, lng: number | null, radiusMiles = 25) => {
  const [doctors, setDoctors] = useState<NearbyDoctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lat === null || lng === null) return;

    const fetchNearbyDoctors = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('nearby_doctors', {
          user_lat: lat,
          user_lon: lng,
          radius_miles: radiusMiles,
        });

        if (rpcError) throw rpcError;

        if (!data || data.length === 0) {
          setDoctors([]);
          return;
        }

        const doctorIds = data.map((d: any) => d.doctor_user_id);
        const distanceMap = new Map(data.map((d: any) => [d.doctor_user_id, d.distance_miles]));

        // Fetch doctor profiles
        const { data: profiles } = await supabase
          .from('public_doctor_profiles')
          .select('doctor_user_id, first_name, last_name, specialization, avatar_url, rating, home_service_fee, consultation_fee, bio')
          .in('doctor_user_id', doctorIds);

        const enriched: NearbyDoctor[] = (profiles || []).map((p: any) => ({
          ...p,
          distance_miles: distanceMap.get(p.doctor_user_id) || 0,
        }));

        enriched.sort((a, b) => a.distance_miles - b.distance_miles);
        setDoctors(enriched);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch nearby doctors');
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyDoctors();
  }, [lat, lng, radiusMiles]);

  return { doctors, loading, error };
};
