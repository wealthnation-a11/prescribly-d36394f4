import { useState, useEffect } from 'react';
import { GeoLocationService, LocationData } from '@/services/GeoLocationService';

export const useGeolocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectLocation = async () => {
      try {
        setLoading(true);
        const locationData = await GeoLocationService.getUserLocation();
        setLocation(locationData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to detect location');
        // Set default location on error
        setLocation({
          country: 'United States',
          countryCode: 'US',
          currency: 'USD',
          currencySymbol: '$'
        });
      } finally {
        setLoading(false);
      }
    };

    detectLocation();
  }, []);

  return {
    location,
    loading,
    error,
    isNigerian: location?.countryCode === 'NG'
  };
};