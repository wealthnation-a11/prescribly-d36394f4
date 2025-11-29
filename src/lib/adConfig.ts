import { Capacitor } from '@capacitor/core';

export const AD_CONFIG = {
  admob: {
    appId: 'ca-app-pub-8121946732506963~4051149660',
    banner: 'ca-app-pub-8121946732506963/9019977028',
    native: 'ca-app-pub-8121946732506963/5193957246',
    interstitial: 'ca-app-pub-8121946732506963/9847625923',
  },
  // Test mode for development
  testMode: import.meta.env.DEV,
  testDeviceIds: [],
};

export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

export const getAdUnit = (type: 'banner' | 'native' | 'interstitial') => {
  return AD_CONFIG.admob[type];
};
