import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import MapView, {
  Camera,
  PROVIDER_GOOGLE,
  MapViewProps,
  Region,
} from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FALLBACK_REGION: Region = {
  latitude: 4.6097,
  longitude: -74.0817,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

/**
 * Expo Go trae Maps embebido. En APK/AAB hace falta
 * android.config.googleMaps.apiKey (ver app.config.js).
 * No leer la apiKey desde Constants: Expo la redacta en runtime.
 */
export function hasAndroidGoogleMapsKey(): boolean {
  if (Platform.OS !== 'android') return true;
  if (Constants.appOwnership === 'expo') return true;
  return Boolean(Constants.expoConfig?.extra?.googleMapsConfigured);
}

export function sanitizeRegion(region?: Region | null): Region {
  if (
    region &&
    Number.isFinite(region.latitude) &&
    Number.isFinite(region.longitude) &&
    Math.abs(region.latitude) <= 90 &&
    Math.abs(region.longitude) <= 180 &&
    Number.isFinite(region.latitudeDelta) &&
    Number.isFinite(region.longitudeDelta) &&
    region.latitudeDelta > 0 &&
    region.longitudeDelta > 0
  ) {
    return {
      latitude: region.latitude,
      longitude: region.longitude,
      latitudeDelta: region.latitudeDelta,
      longitudeDelta: region.longitudeDelta,
    };
  }
  return FALLBACK_REGION;
}

/**
 * iOS: Apple Maps (sin API key). Forzar PROVIDER_GOOGLE sin clave crashea nativo.
 * Android: Google Maps. Nunca enviar `altitude` (solo iOS) ni mezclar zoom+altitude.
 */
export function sanitizeCamera(camera?: Camera | null): Camera | undefined {
  if (!camera?.center) return undefined;
  const { latitude, longitude } = camera.center;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return undefined;
  }

  const pitch = Number.isFinite(camera.pitch)
    ? Math.min(45, Math.max(0, camera.pitch))
    : 0;
  const heading = Number.isFinite(camera.heading) ? camera.heading : 0;

  if (Platform.OS === 'android') {
    return {
      center: { latitude, longitude },
      pitch,
      heading,
      zoom: Number.isFinite(camera.zoom) ? camera.zoom : 15,
    };
  }

  return {
    center: { latitude, longitude },
    pitch,
    heading,
    altitude: Number.isFinite(camera.altitude) ? camera.altitude : 2500,
  };
}

export const SafeMap = React.forwardRef<MapView, MapViewProps>(
  function SafeMap(
    { provider: _ignored, initialCamera, initialRegion, ...props },
    ref,
  ) {
    if (!hasAndroidGoogleMapsKey()) {
      return (
        <View style={[styles.fallback, props.style]}>
          <MaterialCommunityIcons name="map-marker-off" size={48} color="#94a3b8" />
          <Text style={styles.fallbackTitle}>Mapa no configurado</Text>
          <Text style={styles.fallbackSub}>
            Falta GOOGLE_MAPS_API_KEY en el build nativo. Añádela en .env o EAS
            Secrets y vuelve a generar el APK.
          </Text>
        </View>
      );
    }

    const provider = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;
    const camera = sanitizeCamera(initialCamera ?? undefined);
    const region = sanitizeRegion(initialRegion ?? null);

    return (
      <MapView
        ref={ref}
        {...props}
        provider={provider}
        initialRegion={region}
        {...(camera ? { initialCamera: camera } : {})}
      />
    );
  },
);

interface MapErrorBoundaryState {
  hasError: boolean;
}

export class MapErrorBoundary extends Component<
  { children: ReactNode },
  MapErrorBoundaryState
> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MapErrorBoundary', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallback}>
          <MaterialCommunityIcons name="map-marker-off" size={48} color="#94a3b8" />
          <Text style={styles.fallbackTitle}>No se pudo cargar el mapa</Text>
          <Text style={styles.fallbackSub}>
            Revisa los permisos de ubicación e inténtalo de nuevo.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  fallbackTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  fallbackSub: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
