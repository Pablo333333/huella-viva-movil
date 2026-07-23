import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { MapPulse } from './MapPulse';
import { SafeMap } from './SafeMap';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useActivities } from '@/features/activities/hooks/use-activities';
import { useCommunities } from '@/features/communities/hooks/use-communities';
import { Activity } from '@/features/activities/types';

type MapPointType = 'COMMUNITY' | 'ACTIVITY' | 'PROJECT';

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

const DEFAULT_LNG = -74.0817;

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
): MapPoint {
  const lat = activity.location ?? communityLat;
  const lng = communityLng + hashOffset(activity.id) * (hashOffset(activity.id + 'x') > 0.5 ? 1 : -1);

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

export const LiveMap: React.FC = () => {
  const router = useRouter();
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const { data: communities, isLoading: loadingCommunities } = useCommunities();
  const { data: activities, isLoading: loadingActivities } = useActivities();

  const points = useMemo(() => {
    const result: MapPoint[] = [];
    const communityList = communities || [];
    const activityList = activities || [];

    for (const community of communityList) {
      const lat = community.location ?? 4.6097;
      result.push({
        id: `community-${community.id}`,
        type: 'COMMUNITY',
        latitude: lat,
        longitude: DEFAULT_LNG,
        title: community.nombre,
        subtitle: 'Territorio',
        poblacion: community.poblacion,
      });
    }

    for (const activity of activityList) {
      const community =
        communityList.find((c) => c.id === activity.communityId) ||
        communityList[0];
      const lat = community?.location ?? activity.location ?? 4.6097;
      const name = community?.nombre || 'Territorio';
      result.push(activityToPoint(activity, lat, DEFAULT_LNG, name));
    }

    if (result.length === 0) {
      result.push({
        id: 'fallback',
        type: 'COMMUNITY',
        latitude: 4.6097,
        longitude: DEFAULT_LNG,
        title: 'Huella Viva 360',
        subtitle: 'Sin puntos aún — usa Terra Voz',
      });
    }

    return result;
  }, [communities, activities]);

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
    if (type === 'COMMUNITY') return '#059669';
    return '#6b7280';
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

  if (loadingCommunities || loadingActivities) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Cargando mapa territorial...</Text>
      </View>
    );
  }

  const center = points[0]
    ? { latitude: points[0].latitude, longitude: points[0].longitude }
    : { latitude: 4.6097, longitude: DEFAULT_LNG };

  return (
    <View style={styles.container}>
      <SafeMap
        style={styles.map}
        initialCamera={{
          center,
          pitch: 45,
          heading: 20,
          altitude: 1800,
          zoom: 14,
        }}
        showsUserLocation
        showsCompass={false}
      >
        {points.map((point) => (
          <Marker
            key={point.id}
            coordinate={{
              latitude: point.latitude,
              longitude: point.longitude,
            }}
            onPress={() => setSelectedPoint(point)}
            tracksViewChanges={false}
          >
            <View style={styles.markerContainer}>
              <MapPulse
                color={getMarkerColor(point.type, point.activityTipo)}
              />
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: getMarkerColor(
                      point.type,
                      point.activityTipo,
                    ),
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={getMarkerIcon(point.type, point.activityTipo)}
                  size={16}
                  color="white"
                />
              </View>
            </View>
          </Marker>
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
        <Text style={styles.badge3DText}>
          {activityCountLabel(activities?.length || 0)}
        </Text>
      </View>
    </View>
  );
};

function activityCountLabel(count: number) {
  return count === 0
    ? 'TERRA VOZ · SIN PINES AÚN'
    : `${count} ACTIVIDAD${count === 1 ? '' : 'ES'} EN MAPA`;
}

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
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badge3DText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
