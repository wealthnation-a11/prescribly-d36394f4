import { useEffect, useRef } from 'react';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { useAdContext } from './AdProvider';
import { getAdUnit } from '@/lib/adConfig';

interface AdMobBannerProps {
  position?: BannerAdPosition;
  size?: BannerAdSize;
}

export const AdMobBanner = ({ 
  position = BannerAdPosition.BOTTOM_CENTER,
  size = BannerAdSize.BANNER 
}: AdMobBannerProps) => {
  const { isInitialized, isNative } = useAdContext();
  const isShowing = useRef(false);

  useEffect(() => {
    const showBanner = async () => {
      if (!isInitialized || !isNative || isShowing.current) return;

      try {
        const options: BannerAdOptions = {
          adId: getAdUnit('banner'),
          adSize: size,
          position,
          isTesting: true, // Set to false in production
        };

        await AdMob.showBanner(options);
        isShowing.current = true;
      } catch (error) {
        console.error('Failed to show banner:', error);
      }
    };

    showBanner();

    return () => {
      if (isShowing.current) {
        AdMob.hideBanner().catch(console.error);
        isShowing.current = false;
      }
    };
  }, [isInitialized, isNative, position, size]);

  // AdMob banners are rendered natively, no DOM element needed
  return null;
};
