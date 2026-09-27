/**
 * Expo config dinámica: inyecta GOOGLE_MAPS_API_KEY desde .env / EAS Secrets.
 * app.json no interpola process.env; sin esta clave el APK Android crashea al montar MapView.
 *
 * Variables admitidas:
 * - GOOGLE_MAPS_API_KEY (compartida)
 * - GOOGLE_MAPS_API_KEY_ANDROID / GOOGLE_MAPS_API_KEY_IOS (opcionales)
 */
const androidMapsKey =
  process.env.GOOGLE_MAPS_API_KEY_ANDROID ||
  process.env.GOOGLE_MAPS_API_KEY ||
  '';
const iosMapsKey =
  process.env.GOOGLE_MAPS_API_KEY_IOS ||
  process.env.GOOGLE_MAPS_API_KEY ||
  '';

export default {
  name: 'Huella Viva',
  slug: 'huella-viva',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'mobile',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Huella Viva necesita tu ubicación para centrar el mapa territorial y asignar la comunidad.',
      NSMicrophoneUsageDescription: 'Huella Viva usa el micrófono para Terra Voz.',
    },
    ...(iosMapsKey
      ? { config: { googleMapsApiKey: iosMapsKey } }
      : {}),
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
    },
    package: 'com.huellaviva.app',
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'RECORD_AUDIO',
    ],
    ...(androidMapsKey
      ? { config: { googleMaps: { apiKey: androidMapsKey } } }
      : {}),
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Huella Viva necesita tu ubicación para centrar el mapa territorial.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: 'b5ac19d7-4ea1-4e40-b261-1b7fdbd35c68',
    },
    /** Flag seguro (Expo redacta la apiKey en Constants). */
    googleMapsConfigured: Boolean(androidMapsKey),
  },
};
