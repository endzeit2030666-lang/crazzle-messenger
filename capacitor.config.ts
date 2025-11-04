import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crazzle.app',
  appName: 'Crazzle',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
