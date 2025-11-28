import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';

export const initializeNativePlugins = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Not a native platform, skipping native plugin initialization');
    return;
  }

  try {
    // Configure Status Bar
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#ffffff' });

    // Hide splash screen after app is ready
    await SplashScreen.hide();

    // Listen for app state changes
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active:', isActive);
    });

    // Listen for back button (Android)
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });

    console.log('Native plugins initialized successfully');
  } catch (error) {
    console.error('Error initializing native plugins:', error);
  }
};
