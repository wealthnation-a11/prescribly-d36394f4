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
        // Fetch all approved doctors and calculate distance client-side
        const { data: doctorsData, error: docError } = await supabase
          .from('doctors')
          .select('user_id, specialization, rating, home_service_fee, consultation_fee, bio, latitude, longitude')
          .eq('verification_status', 'approved');

        if (docError) throw docError;

        if (!doctorsData || doctorsData.length === 0) {
          setDoctors([]);
          return;
        }

        // Calculate distances
        const toRad = (deg: number) => deg * Math.PI / 180;
        const calcDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 3959; // miles
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        };

        const nearby = doctorsData
          .filter(d => d.latitude && d.longitude)
          .map(d => ({ ...d, distance_miles: calcDist(lat!, lng!, d.latitude!, d.longitude!) }))
          .filter(d => d.distance_miles <= radiusMiles);

        // Fetch profiles for these doctors
        const userIds = nearby.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

        const enriched: NearbyDoctor[] = nearby.map(d => {
          const p = profileMap.get(d.user_id) || {};
          return {
            doctor_user_id: d.user_id,
            distance_miles: d.distance_miles,
            first_name: (p as any).first_name || '',
            last_name: (p as any).last_name || '',
            specialization: d.specialization,
            avatar_url: (p as any).avatar_url || null,
            rating: d.rating,
            home_service_fee: d.home_service_fee,
            consultation_fee: d.consultation_fee,
            bio: d.bio,
          };
        });

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
