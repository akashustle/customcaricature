import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration — Play Store ready.
 *
 * IMPORTANT: When building a *release* AAB for the Play Store, comment out
 * the `server` block entirely (or remove the `url` field) so the app loads
 * the bundled offline `dist/` build instead of the live Lovable preview.
 *
 * The current `server.url` is for hot-reload during development only —
 * pull the repo locally and run `npx cap run android` to use it.
 */
const config: CapacitorConfig = {
  appId: 'app.lovable.161b75a406564c37978eee2b04e19101',
  appName: 'Custom Caricature Club',
  webDir: 'dist',

  // Comment this whole `server` block before the production Play Store build
  server: {
    url: 'https://161b75a4-0656-4c37-978e-ee2b04e19101.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    androidScheme: 'https',
  },

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
