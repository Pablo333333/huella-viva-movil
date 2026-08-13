import * as Location from 'expo-location';

export type DeviceCoords = {
  latitude: number;
  longitude: number;
  placeName?: string | null;
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

    const placeName = await reverseGeocodePlace(latitude, longitude);
    return { latitude, longitude, placeName };
  } catch (err) {
    console.warn('[GPS] No se pudo obtener ubicación', err);
    return null;
  }
}

/** Convierte coords GPS en un nombre de lugar libre (ciudad, barrio, región, país). */
export async function reverseGeocodePlace(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = results[0];
    if (!place) return null;

    const parts = [
      place.district || place.name,
      place.city || place.subregion,
      place.region,
      place.country,
    ]
      .map((part) => part?.trim())
      .filter((part, index, all): part is string => !!part && all.indexOf(part) === index);

    if (parts.length === 0) return null;
    return parts.join(', ');
  } catch (err) {
    console.warn('[GPS] Reverse geocode falló', err);
    return null;
  }
}
