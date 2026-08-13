import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Camera, Marker, Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { MapErrorBoundary, SafeMap, sanitizeCamera } from './SafeMap';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useActivities } from '@/features/activities/hooks/use-activities';
import { useCommunities } from '@/features/communities/hooks/use-communities';
import { Activity } from '@/features/activities/types';
import { Community } from '@/features/communities/services/communities.service';

type MapPointType = 'COMMUNITY' | 'ACTIVITY';

interface MapPoint {
  id: string;
  type: MapPointType;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  poblacion?: number;
  estado?: string;
  activityId?: string;
  activityTipo?: string;
}

const NEIGHBORHOOD_DELTA = 0.035;
/** Zoom cercano al usuario para el centro de mando. */
const USER_DELTA = 0.018;
const MIN_DELTA = 0.02;
const MAX_DELTA = 0.35;
const BBOX_PADDING = 0.2;
const FALLBACK_COLOMBIA = { latitude: 4.6097, longitude: -74.0817 };
/** Inclinación fija tipo centro de mando (segura en iOS y Android). */
const COMMAND_PITCH = 45;
const COMMAND_HEADING = 0;

function regionToCommandCamera(region: Region): Camera {
  if (Platform.OS === 'android') {
    const delta = Math.max(region.latitudeDelta, region.longitudeDelta);
    const zoom = Math.min(17, Math.max(11, Math.log2(360 / delta) - 1.2));
    return {
      center: { latitude: region.latitude, longitude: region.longitude },
      pitch: COMMAND_PITCH,
      heading: COMMAND_HEADING,
      zoom,
    };
  }

  return {
    center: { latitude: region.latitude, longitude: region.longitude },
    pitch: COMMAND_PITCH,
    heading: COMMAND_HEADING,
    altitude: Math.max(900, Math.min(7000, region.latitudeDelta * 111_000 * 1.6)),
  };
}

function isValidCoord(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat !== 0 &&
    lng !== 0 &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function isValidRegion(region: Region | null): region is Region {
  return (
    !!region &&
    isValidCoord(region.latitude, region.longitude) &&
    Number.isFinite(region.latitudeDelta) &&
    Number.isFinite(region.longitudeDelta) &&
    region.latitudeDelta > 0 &&
    region.longitudeDelta > 0
  );
}

function hashOffset(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 100000;
}

function communityCoords(community?: Community | null): {
  latitude: number;
  longitude: number;
} | null {
  if (!community) return null;
  const lat = community.latitude ?? community.location ?? null;
  const lng = community.longitude ?? null;
  if (!isValidCoord(lat, lng)) return null;
  return { latitude: lat!, longitude: lng! };
}

function activityToPoint(
  activity: Activity,
  fallbackLat: number,
  fallbackLng: number,
  communityName: string,
): MapPoint | null {
  if (isValidCoord(activity.latitude, activity.longitude)) {
    return {
      id: `activity-${activity.id}`,
      type: 'ACTIVITY',
      latitude: activity.latitude!,
      longitude: activity.longitude!,
      title: activity.descripcion.slice(0, 60),
      subtitle: `${activity.tipo} · ${communityName}`,
      estado: activity.estado || activity.tipo,
      activityId: activity.id,
      activityTipo: activity.tipo,
    };
  }

  const lat = activity.location ?? fallbackLat;
  const lng =
    fallbackLng +
    hashOffset(activity.id) * (hashOffset(`${activity.id}-lng`) > 0.5 ? 1 : -1);

  if (!Number.isFinite(lat) || lat === 0) return null;

  const pointLat = lat + hashOffset(activity.id) * 0.002;
  if (!isValidCoord(pointLat, lng)) return null;

  return {
    id: `activity-${activity.id}`,
    type: 'ACTIVITY',
    latitude: pointLat,
    longitude: lng,
    title: activity.descripcion.slice(0, 60),
    subtitle: `${activity.tipo} · ${communityName}`,
    estado: activity.estado || activity.tipo,
    activityId: activity.id,
    activityTipo: activity.tipo,
  };
}

function buildRegion(
  latitude: number,
  longitude: number,
  delta = NEIGHBORHOOD_DELTA,
): Region {
  return {
    latitude,
    longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

function buildRegionFromPoints(points: MapPoint[]): Region | null {
  const valid = points.filter((p) => isValidCoord(p.latitude, p.longitude));
  if (valid.length === 0) return null;

  if (valid.length === 1) {
    return buildRegion(valid[0].latitude, valid[0].longitude, NEIGHBORHOOD_DELTA);
  }

  let minLat = valid[0].latitude;
  let maxLat = valid[0].latitude;
  let minLng = valid[0].longitude;
  let maxLng = valid[0].longitude;

  for (const p of valid) {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
  }

  const latSpan = Math.max(maxLat - minLat, MIN_DELTA);
  const lngSpan = Math.max(maxLng - minLng, MIN_DELTA);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.min(latSpan * (1 + BBOX_PADDING), MAX_DELTA),
    longitudeDelta: Math.min(lngSpan * (1 + BBOX_PADDING), MAX_DELTA),
  };
}

export const LiveMap: React.FC = () => {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const mapReadyRef = useRef(false);
  const gpsInitStarted = useRef(false);

  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [locationLabel, setLocationLabel] = useState('SOLICITANDO GPS…');
  const [bootstrapping, setBootstrapping] = useState(true);
  const [canShowUserLocation, setCanShowUserLocation] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);

  const { data: communities } = useCommunities();
  const { data: activities } = useActivities();

  const applyCommandCamera = (region: Region, animate = false) => {
    const camera = sanitizeCamera(regionToCommandCamera(region));
    if (!camera || !mapRef.current) return;
    if (animate) {
      mapRef.current.animateCamera(camera, { duration: 700 });
    } else {
      mapRef.current.setCamera(camera);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => setMapMounted(true), 40);
    return () => clearTimeout(timeout);
  }, []);

  const points = useMemo(() => {
    const result: MapPoint[] = [];
    const communityList = communities || [];
    const activityList = activities || [];

    for (const community of communityList) {
      const coords = communityCoords(community);
      if (!coords) continue;

      result.push({
        id: `community-${community.id}`,
        type: 'COMMUNITY',
        latitude: coords.latitude,
        longitude: coords.longitude,
        title: community.nombre,
        subtitle: 'Territorio',
        poblacion: community.poblacion,
      });
    }

    for (const activity of activityList) {
      const community =
        communityList.find((c) => c.id === activity.communityId) ||
        communityList[0];
      const coords =
        communityCoords(community) ||
        (isValidCoord(activity.latitude, activity.longitude)
          ? { latitude: activity.latitude!, longitude: activity.longitude! }
          : FALLBACK_COLOMBIA);
      const name = community?.nombre || activity.communityName || 'Territorio';
      const point = activityToPoint(activity, coords.latitude, coords.longitude, name);
      if (!point || !isValidCoord(point.latitude, point.longitude)) continue;
      result.push(point);
    }

    return result;
  }, [communities, activities]);

  useEffect(() => {
    if (gpsInitStarted.current) return;
    gpsInitStarted.current = true;

    let cancelled = false;

    async function bootstrapUserLocation() {
      setLocationLabel('SOLICITANDO GPS…');

      let granted = false;
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        granted = permission.status === 'granted';
      } catch (err) {
        console.warn('LiveMap: error pidiendo permiso de ubicación', err);
      }
      if (cancelled) return;

      setCanShowUserLocation(granted);

      if (granted) {
        try {
          let latitude: number | null = null;
          let longitude: number | null = null;

          const lastKnown = await Location.getLastKnownPositionAsync();
          if (
            lastKnown &&
            isValidCoord(lastKnown.coords.latitude, lastKnown.coords.longitude)
          ) {
            latitude = lastKnown.coords.latitude;
            longitude = lastKnown.coords.longitude;
          }

          if (latitude == null || longitude == null) {
            const current = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            if (isValidCoord(current.coords.latitude, current.coords.longitude)) {
              latitude = current.coords.latitude;
              longitude = current.coords.longitude;
            }
          } else {
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            })
              .then((position) => {
                if (cancelled) return;
                if (
                  !isValidCoord(
                    position.coords.latitude,
                    position.coords.longitude,
                  )
                ) {
                  return;
                }
                const refined = buildRegion(
                  position.coords.latitude,
                  position.coords.longitude,
                  USER_DELTA,
                );
                setInitialRegion(refined);
                if (mapReadyRef.current) {
                  applyCommandCamera(refined, true);
                }
              })
              .catch(() => {});
          }

          if (latitude != null && longitude != null) {
            const region = buildRegion(latitude, longitude, USER_DELTA);
            setInitialRegion(region);
            setLocationLabel('TU UBICACIÓN · CENTRO DE MANDO');
            setBootstrapping(false);
            return;
          }
        } catch (err) {
          console.warn('LiveMap: GPS no disponible para región inicial', err);
        }
      }

      if (cancelled) return;
      const pinsRegion = buildRegionFromPoints(points);
      setInitialRegion(
        pinsRegion ||
          buildRegion(FALLBACK_COLOMBIA.latitude, FALLBACK_COLOMBIA.longitude),
      );
      setLocationLabel(
        granted
          ? pinsRegion
            ? 'ENCUADRE · PINES'
            : 'FALLBACK · COLOMBIA'
          : 'GPS DENEGADO · ENCUADRE',
      );
      setBootstrapping(false);
    }

    bootstrapUserLocation();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMarkerColor = (type: string, activityTipo?: string) => {
    if (type === 'ACTIVITY') {
      switch (activityTipo) {
        case 'REUNION':
          return '#3b82f6';
        case 'VISITA':
          return '#10b981';
        case 'INSPECCION':
          return '#8b5cf6';
        case 'TALLER':
          return '#f59e0b';
        default:
          return '#ef4444';
      }
    }
    return '#059669';
  };

  const getMarkerIcon = (type: string, activityTipo?: string): any => {
    if (type === 'ACTIVITY') {
      switch (activityTipo) {
        case 'REUNION':
          return 'account-group';
        case 'VISITA':
          return 'map-marker-check';
        case 'INSPECCION':
          return 'clipboard-check';
        case 'TALLER':
          return 'school';
        default:
          return 'microphone';
      }
    }
    return 'home-group';
  };

  if (bootstrapping || !isValidRegion(initialRegion) || !mapMounted) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>
          {locationLabel === 'SOLICITANDO GPS…'
            ? 'Activando ubicación para el centro de mando...'
            : 'Centrando mapa en tu posición...'}
        </Text>
      </View>
    );
  }

  return (
    <MapErrorBoundary>
      <View style={styles.container}>
        <SafeMap
          ref={mapRef}
          style={styles.map}
          mapType="satellite"
          initialRegion={initialRegion}
          onMapReady={() => {
            mapReadyRef.current = true;
            if (!initialRegion) return;
            applyCommandCamera(initialRegion, true);
          }}
          pitchEnabled={false}
          rotateEnabled
          scrollEnabled
          zoomEnabled
          showsUserLocation={canShowUserLocation}
          showsMyLocationButton={canShowUserLocation}
          showsCompass={false}
          showsBuildings={false}
          showsIndoors={false}
          showsTraffic={false}
          showsPointsOfInterest={false}
          toolbarEnabled={false}
          moveOnMarkerPress={false}
          loadingEnabled={false}
        >
          {points.map((point) => (
            <Marker
              key={point.id}
              identifier={point.id}
              coordinate={{
                latitude: point.latitude,
                longitude: point.longitude,
              }}
              title={point.title}
              description={point.subtitle}
              pinColor={getMarkerColor(point.type, point.activityTipo)}
              onPress={() => setSelectedPoint(point)}
            />
          ))}
        </SafeMap>

        {selectedPoint && (
          <View style={styles.sheetContainer}>
            <View style={styles.sheetContent}>
              <View style={styles.sheetHeader}>
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor:
                        getMarkerColor(
                          selectedPoint.type,
                          selectedPoint.activityTipo,
                        ) + '20',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={getMarkerIcon(
                      selectedPoint.type,
                      selectedPoint.activityTipo,
                    )}
                    size={14}
                    color={getMarkerColor(
                      selectedPoint.type,
                      selectedPoint.activityTipo,
                    )}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      {
                        color: getMarkerColor(
                          selectedPoint.type,
                          selectedPoint.activityTipo,
                        ),
                      },
                    ]}
                  >
                    {selectedPoint.activityTipo || selectedPoint.type}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedPoint(null)}
                  style={styles.closeIconButton}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <Text style={styles.sheetTitle}>{selectedPoint.title}</Text>
              <Text style={styles.sheetSubtitle}>{selectedPoint.subtitle}</Text>

              <View style={styles.detailsGrid}>
                {selectedPoint.poblacion != null && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Población</Text>
                    <Text style={styles.detailValue}>
                      {selectedPoint.poblacion} hab.
                    </Text>
                  </View>
                )}
                {selectedPoint.estado && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Estado</Text>
                    <Text style={styles.detailValue}>{selectedPoint.estado}</Text>
                  </View>
                )}
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Coords</Text>
                  <Text style={styles.detailValue}>
                    {selectedPoint.latitude.toFixed(4)},{' '}
                    {selectedPoint.longitude.toFixed(4)}
                  </Text>
                </View>
              </View>

              {selectedPoint.activityId && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: getMarkerColor(
                        selectedPoint.type,
                        selectedPoint.activityTipo,
                      ),
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    router.push(`/(tabs)/memoria/${selectedPoint.activityId}`);
                    setSelectedPoint(null);
                  }}
                >
                  <Text style={styles.actionButtonText}>Ver seguimiento</Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={styles.badge3D}>
          <Text style={styles.badge3DText}>SATÉLITE · CENTRO DE MANDO</Text>
          <Text style={styles.badge3DSub}>
            {locationLabel} · {points.length} pines · {activities?.length || 0}{' '}
            actividades
          </Text>
        </View>
      </View>
    </MapErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  map: {
    flex: 1,
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  sheetContent: {
    padding: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  closeIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  detailItem: {
    width: '50%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 10,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  actionButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  badge3D: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    alignItems: 'center',
  },
  badge3DText: {
    color: '#7dd3fc',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  badge3DSub: {
    color: '#cbd5e1',
    fontSize: 10,
    marginTop: 2,
  },
});
