import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration — production native app shell.
 *
 * The app loads the bundled `dist/` build so APK/AAB installs work as a
 * standalone app instead of depending on the live web preview.
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.customcaricature',
  appName: 'Custom Caricature Club',
  webDir: 'dist',

  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#fdf8f3',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#fdf8f3',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#fdf8f3',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
