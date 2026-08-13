import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Camera, PROVIDER_GOOGLE, MapViewProps } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * iOS: Apple Maps (sin API key). Forzar PROVIDER_GOOGLE sin clave crashea nativo.
 * Android: Google Maps. Nunca enviar `altitude` (solo iOS) ni mezclar zoom+altitude.
 */
export function sanitizeCamera(camera?: Camera | null): Camera | undefined {
  if (!camera?.center) return undefined;
  const { latitude, longitude } = camera.center;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;

  const pitch = Number.isFinite(camera.pitch)
    ? Math.min(55, Math.max(0, camera.pitch))
    : 45;
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
  function SafeMap({ provider: _ignored, initialCamera, ...props }, ref) {
    const provider = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;
    const camera = sanitizeCamera(initialCamera ?? undefined);

    return (
      <MapView
        ref={ref}
        {...props}
        provider={provider}
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
