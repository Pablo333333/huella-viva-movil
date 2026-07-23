import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Marker, Region } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { SafeMap } from './SafeMap';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useActivities } from '@/features/activities/hooks/use-activities';
import { useCommunities } from '@/features/communities/hooks/use-communities';
import { Activity } from '@/features/activities/types';

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
const MIN_DELTA = 0.02;
const MAX_DELTA = 0.35;
const BBOX_PADDING = 0.2;
const DEFAULT_PIN_LNG = -74.0817;
const FALLBACK_PERU = { latitude: -12.0464, longitude: -77.0428 };

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

function hashOffset(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 100000;
}

function activityToPoint(
  activity: Activity,
  communityLat: number,
  communityLng: number,
  communityName: string,
): MapPoint | null {
  if (
    typeof activity.latitude === 'number' &&
    typeof activity.longitude === 'number' &&
    Number.isFinite(activity.latitude) &&
    Number.isFinite(activity.longitude) &&
    activity.latitude !== 0 &&
    activity.longitude !== 0
  ) {
    return {
      id: `activity-${activity.id}`,
      type: 'ACTIVITY',
      latitude: activity.latitude,
      longitude: activity.longitude,
      title: activity.descripcion.slice(0, 60),
      subtitle: `${activity.tipo} · ${communityName}`,
      estado: activity.tipo,
      activityId: activity.id,
      activityTipo: activity.tipo,
    };
  }

  const lat = activity.location ?? communityLat;
  const lng =
    communityLng +
    hashOffset(activity.id) *
      (hashOffset(`${activity.id}-lng`) > 0.5 ? 1 : -1);

  if (!Number.isFinite(lat) || lat === 0) return null;

  return {
    id: `activity-${activity.id}`,
    type: 'ACTIVITY',
    latitude: lat + hashOffset(activity.id) * 0.002,
    longitude: lng,
    title: activity.descripcion.slice(0, 60),
    subtitle: `${activity.tipo} · ${communityName}`,
    estado: activity.tipo,
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
  const hasInitializedRegion = useRef(false);
  const initInFlight = useRef(false);

  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  /** Región fija de primer montaje — no se actualiza con pan/zoom */
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [locationLabel, setLocationLabel] = useState('CARGANDO TERRITORIO…');
  const [cameraLockedToPins, setCameraLockedToPins] = useState(false);
  /** Solo true hasta el primer encuadre exitoso */
  const [bootstrapping, setBootstrapping] = useState(true);

  const { data: communities, isLoading: loadingCommunities } = useCommunities();
  const { data: activities, isLoading: loadingActivities } = useActivities();

  const dataLoading = loadingCommunities || loadingActivities;

  const points = useMemo(() => {
    const result: MapPoint[] = [];
    const communityList = communities || [];
    const activityList = activities || [];
    const baseLng = DEFAULT_PIN_LNG;

    for (const community of communityList) {
      const lat = community.location;
      if (typeof lat !== 'number' || !Number.isFinite(lat) || lat === 0) continue;
      if (!isValidCoord(lat, baseLng)) continue;

      result.push({
        id: `community-${community.id}`,
        type: 'COMMUNITY',
        latitude: lat,
        longitude: baseLng,
        title: community.nombre,
        subtitle: 'Territorio',
        poblacion: community.poblacion,
      });
    }

    for (const activity of activityList) {
      const community =
        communityList.find((c) => c.id === activity.communityId) ||
        communityList[0];
      const lat = community?.location ?? activity.location ?? null;
      const name = community?.nombre || 'Territorio';
      const fallbackLat =
        typeof lat === 'number' && Number.isFinite(lat)
          ? lat
          : FALLBACK_PERU.latitude;
      const point = activityToPoint(activity, fallbackLat, baseLng, name);
      if (!point || !isValidCoord(point.latitude, point.longitude)) continue;
      result.push(point);
    }

    return result;
  }, [communities, activities]);

  /**
   * Inicializa la cámara UNA SOLA VEZ cuando llegan los datos (o GPS).
   * No reacciona a pan/zoom ni a refetches posteriores.
   */
  useEffect(() => {
    if (hasInitializedRegion.current || initInFlight.current) return;
    if (dataLoading) return;

    let cancelled = false;
    initInFlight.current = true;

    async function resolveInitialCameraOnce() {
      try {
        const pinsRegion = buildRegionFromPoints(points);
        if (pinsRegion) {
          if (cancelled) return;
          hasInitializedRegion.current = true;
          setInitialRegion(pinsRegion);
          setCameraLockedToPins(true);
          setLocationLabel(
            points.length === 1
              ? 'ENCUADRE · PRIMER PIN'
              : `ENCUADRE · ${points.length} PINES`,
          );
          setBootstrapping(false);
          return;
        }

        setLocationLabel('OBTENIENDO GPS…');

        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (cancelled) return;

          if (status === 'granted') {
            const position = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            if (cancelled) return;

            hasInitializedRegion.current = true;
            setInitialRegion(
              buildRegion(
                position.coords.latitude,
                position.coords.longitude,
              ),
            );
            setCameraLockedToPins(false);
            setLocationLabel('TU UBICACIÓN · SIN PINES');
            setBootstrapping(false);
            return;
          }
        } catch (err) {
          console.warn('LiveMap: GPS no disponible para región inicial', err);
        }

        if (cancelled) return;
        hasInitializedRegion.current = true;
        setInitialRegion(
          buildRegion(FALLBACK_PERU.latitude, FALLBACK_PERU.longitude),
        );
        setCameraLockedToPins(false);
        setLocationLabel('FALLBACK · PERÚ');
        setBootstrapping(false);
      } finally {
        initInFlight.current = false;
      }
    }

    resolveInitialCameraOnce();
    return () => {
      cancelled = true;
    };
    // Solo al pasar de loading→datos; no al panear ni al refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoading]);

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

  // Loader SOLO en el bootstrap inicial — nunca tras el primer paint del mapa
  if (bootstrapping || !initialRegion) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>
          {dataLoading
            ? 'Cargando territorios y actividades...'
            : locationLabel === 'OBTENIENDO GPS…'
              ? 'Sin pines — centrando en tu ubicación...'
              : 'Preparando mapa territorial...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeMap
        style={styles.map}
        mapType="hybrid"
        initialCamera={{
          center: {
            latitude: initialRegion.latitude,
            longitude: initialRegion.longitude,
          },
          // Vista "centro de mando": inclinación 3D + ligera rotación
          pitch: 55,
          heading: 28,
          altitude: 1400,
          zoom: 16,
        }}
        pitchEnabled
        rotateEnabled
        scrollEnabled
        zoomEnabled
        showsUserLocation
        showsMyLocationButton={!cameraLockedToPins}
        showsCompass={false}
        showsBuildings
        mapPadding={{ top: 0, right: 0, bottom: 8, left: 0 }}
        minZoomLevel={11}
        maxZoomLevel={20}
        moveOnMarkerPress={false}
        loadingEnabled
        loadingIndicatorColor="#38bdf8"
        loadingBackgroundColor="#0f172a"
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
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color="#9ca3af"
                />
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
                  <Text style={styles.detailLabel}>Tipo</Text>
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
                <Text style={styles.actionButtonText}>Ver en Memoria Viva</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={18}
                  color="white"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.badge3D}>
        <Text style={styles.badge3DText}>SATÉLITE · VISTA 3D</Text>
        <Text style={styles.badge3DSub}>
          {locationLabel} · {points.length} pines · {activities?.length || 0}{' '}
          actividades
        </Text>
      </View>
    </View>
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
