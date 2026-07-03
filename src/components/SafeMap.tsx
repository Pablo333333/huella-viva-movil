import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { PROVIDER_GOOGLE, MapViewProps } from 'react-native-maps';

export const SafeMap: React.FC<MapViewProps> = (props) => {
  const [isReady, setIsReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    // Pequeño delay para asegurar que el motor nativo esté listo
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (mapError) {
    return (
      <View style={[props.style, styles.errorContainer]}>
        <Text style={styles.errorText}>Error al cargar el mapa nativo:</Text>
        <Text style={styles.errorSubtext}>{mapError}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={[props.style, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Inicializando Google Maps...</Text>
      </View>
    );
  }

  try {
    return (
      <MapView
        {...props}
        provider={PROVIDER_GOOGLE}
        onError={(e) => {
          console.error('MapView Error:', e.nativeEvent.error);
          setMapError(e.nativeEvent.error);
        }}
      />
    );
  } catch (e: any) {
    return (
      <View style={[props.style, styles.errorContainer]}>
        <Text style={styles.errorText}>Crash capturado en MapView:</Text>
        <Text style={styles.errorSubtext}>{e.toString()}</Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 10,
    color: '#6b7280',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 20,
  },
  errorText: {
    color: '#991b1b',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#b91c1c',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});
