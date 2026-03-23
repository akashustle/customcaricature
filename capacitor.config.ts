import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ccc',
  appName: 'Creative Caricature Club',
  webDir: 'dist',
  server: {
    url: 'https://161b75a4-0656-4c37-978e-ee2b04e19101.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
