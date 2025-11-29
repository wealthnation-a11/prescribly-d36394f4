import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prescribly.app',
  appName: 'Prescribly',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For development/testing, you can enable live reload from Lovable sandbox
    // Uncomment the lines below when testing on device/emulator:
    // url: 'https://392fc4b1-ef74-4478-87d5-4180c904cddf.lovableproject.com?forceHideBadge=true',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      spinnerColor: '#0EA5E9',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff',
    },
    AdMob: {
      appId: 'ca-app-pub-8121946732506963~4051149660',
      testingDevices: [],
    },
  },
};

export default config;
