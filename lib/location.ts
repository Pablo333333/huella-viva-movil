import * as Location from 'expo-location';

export type DeviceCoords = {
  latitude: number;
  longitude: number;
};

/**
 * Obtiene la posición GPS actual del dispositivo.
 * Retorna null si no hay permiso o falla la lectura.
 */
export async function getCurrentDeviceCoords(): Promise<DeviceCoords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[GPS] Permiso de ubicación denegado');
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return { latitude, longitude };
  } catch (err) {
    console.warn('[GPS] No se pudo obtener ubicación', err);
    return null;
  }
}
