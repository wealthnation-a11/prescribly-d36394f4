import { useEffect, useState } from 'react';
import { AdMob } from '@capacitor-community/admob';
import { isNativePlatform, AD_CONFIG } from '@/lib/adConfig';

export const useAds = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const initializeAds = async () => {
      const native = isNativePlatform();
      setIsNative(native);

      if (native) {
        try {
          await AdMob.initialize({
            testingDevices: AD_CONFIG.testDeviceIds,
            initializeForTesting: AD_CONFIG.testMode,
          });
          setIsInitialized(true);
        } catch (error) {
          console.error('AdMob initialization failed:', error);
        }
      }
    };

    initializeAds();
  }, []);

  return { isInitialized, isNative };
};
