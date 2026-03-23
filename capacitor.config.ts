import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.161b75a406564c37978eee2b04e19101',
  appName: 'customcaricature',
  webDir: 'dist',
  server: {
    url: 'https://161b75a4-0656-4c37-978e-ee2b04e19101.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#fdf8f3',
      showSpinner: false,
    },
  },
};

export default config;
