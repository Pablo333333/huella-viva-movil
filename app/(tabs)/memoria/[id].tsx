import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  useActivity,
  useUpdateActivityEstado,
  useUpdateCommitmentEstado,
} from '@/features/activities/hooks/use-activities';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { isAdminRole } from '@/features/auth/roles';
import { ActivityStatus } from '@/features/activities/types';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const updateEstado = useUpdateActivityEstado();
  const updateCommitment = useUpdateCommitmentEstado();

  const { data: activity, isLoading, error, refetch } = useActivity(id as string);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Cargando seguimiento...</Text>
      </View>
    );
  }

  if (error || !activity) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'No encontrado' }} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Registro no encontrado</Text>
          <Text style={styles.errorSubtitle}>La actividad que buscas no existe o ha sido eliminada.</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/(tabs)/memoria')}
          >
            <Text style={styles.backBtnText}>Volver a Memoria</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activityDate = new Date(activity.fecha);
  const isProgramada = activity.estado === 'PROGRAMADA';

  const toggleEstado = async () => {
    const next: ActivityStatus = isProgramada ? 'EJECUTADA' : 'PROGRAMADA';
    try {
      await updateEstado.mutateAsync({ id: activity.id, estado: next });
      refetch();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el estado.');
    }
  };

  const markCommitmentDone = async (commitmentId: string) => {
    try {
      await updateCommitment.mutateAsync({
        activityId: activity.id,
        commitmentId,
        estado: 'CUMPLIDO',
      });
      refetch();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el compromiso.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Seguimiento',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="black" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.typeBadgeContainer}>
          <View style={[styles.typeBadge, { backgroundColor: getActivityColor(activity.tipo) + '20' }]}>
            <MaterialCommunityIcons name={getActivityIcon(activity.tipo)} size={16} color={getActivityColor(activity.tipo)} />
            <Text style={[styles.typeBadgeText, { color: getActivityColor(activity.tipo) }]}>{activity.tipo}</Text>
          </View>
          <View style={[styles.statusBadge, isProgramada ? styles.statusProgramada : styles.statusEjecutada]}>
            <Text style={[styles.statusBadgeText, isProgramada ? styles.statusProgramadaText : styles.statusEjecutadaText]}>
              {isProgramada ? 'Programada' : 'Ejecutada'}
            </Text>
          </View>
        </View>

        <Text style={styles.dateText}>
          {format(activityDate, "d 'de' MMMM, yyyy", { locale: es })}
        </Text>
        <Text style={styles.description}>{activity.descripcion}</Text>

        <View style={styles.metaCard}>
          <Text style={styles.metaRow}>
            Comunidad: <Text style={styles.metaStrong}>{activity.communityName || 'Territorio'}</Text>
          </Text>
          {activity.latitude != null && activity.longitude != null && (
            <Text style={styles.metaRow}>
              GPS: <Text style={styles.metaStrong}>{activity.latitude.toFixed(5)}, {activity.longitude.toFixed(5)}</Text>
            </Text>
          )}
        </View>

        {isAdmin && (
          <TouchableOpacity style={styles.estadoBtn} onPress={toggleEstado} disabled={updateEstado.isPending}>
            <MaterialCommunityIcons name="swap-horizontal" size={18} color="#1d4ed8" />
            <Text style={styles.estadoBtnText}>
              Marcar como {isProgramada ? 'ejecutada' : 'programada'}
            </Text>
          </TouchableOpacity>
        )}

        {activity.fotoUrl && (
          <Image source={{ uri: activity.fotoUrl }} style={styles.mainImage} />
        )}

        {activity.audioUrl && (
          <View style={styles.audioSection}>
            <Text style={styles.sectionTitle}>Registro de Voz</Text>
            <TouchableOpacity style={styles.audioPlayer}>
              <MaterialCommunityIcons name="play-circle" size={32} color="#3b82f6" />
              <Text style={styles.audioPlayerText}>Reproducir Terra Voz</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compromisos e Hitos</Text>
          {activity.commitments && activity.commitments.length > 0 ? (
            activity.commitments.map((commitment: any) => (
              <View key={commitment.id} style={styles.commitmentCard}>
                <View style={styles.commitmentHeader}>
                  <MaterialCommunityIcons
                    name={commitment.estado === 'CUMPLIDO' ? 'check-circle' : 'clock-outline'}
                    size={20}
                    color={commitment.estado === 'CUMPLIDO' ? '#10b981' : '#f59e0b'}
                  />
                  <Text style={styles.commitmentDesc}>{commitment.descripcion}</Text>
                </View>
                <View style={styles.commitmentMeta}>
                  <Text style={styles.metaLabel}>
                    Responsable: <Text style={styles.metaValue}>{commitment.responsable}</Text>
                  </Text>
                  <Text style={styles.metaLabel}>
                    Estado: <Text style={styles.metaValue}>{commitment.estado}</Text>
                  </Text>
                  {commitment.fecha_cumplimiento && (
                    <Text style={styles.metaLabel}>
                      Fecha:{' '}
                      <Text style={styles.metaValue}>
                        {format(new Date(commitment.fecha_cumplimiento), 'dd MMM, yyyy', { locale: es })}
                      </Text>
                    </Text>
                  )}
                </View>
                {isAdmin && commitment.estado !== 'CUMPLIDO' && (
                  <TouchableOpacity
                    style={styles.hitoBtn}
                    onPress={() => markCommitmentDone(commitment.id)}
                    disabled={updateCommitment.isPending}
                  >
                    <Text style={styles.hitoBtnText}>Marcar hito cumplido</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No se registraron compromisos en esta actividad.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getActivityColor = (type: string) => {
  switch (type) {
    case 'REUNION': return '#3b82f6';
    case 'INSPECCION': return '#8b5cf6';
    case 'VISITA': return '#10b981';
    case 'TALLER': return '#f59e0b';
    default: return '#6b7280';
  }
};

const getActivityIcon = (type: string): any => {
  switch (type) {
    case 'REUNION': return 'account-group';
    case 'INSPECCION': return 'clipboard-check';
    case 'VISITA': return 'map-marker-check';
    case 'TALLER': return 'school';
    default: return 'calendar-check';
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 16 },
  scrollContent: { padding: 20 },
  typeBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeBadgeText: { marginLeft: 6, fontSize: 12, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusProgramada: { backgroundColor: '#fef3c7' },
  statusEjecutada: { backgroundColor: '#dcfce7' },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  statusProgramadaText: { color: '#b45309' },
  statusEjecutadaText: { color: '#15803d' },
  dateText: { fontSize: 13, color: '#94a3b8', marginBottom: 8 },
  description: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1e293b',
    lineHeight: 26,
    marginBottom: 16,
  },
  metaCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaRow: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  metaStrong: { color: '#0f172a', fontWeight: '700' },
  estadoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  estadoBtnText: { color: '#1d4ed8', fontWeight: '700' },
  mainImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  commitmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  commitmentHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  commitmentDesc: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b', fontWeight: '500' },
  commitmentMeta: { marginLeft: 30 },
  metaLabel: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  metaValue: { color: '#1e293b', fontWeight: '600' },
  hitoBtn: {
    marginTop: 10,
    marginLeft: 30,
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  hitoBtnText: { color: '#15803d', fontWeight: '700', fontSize: 12 },
  audioSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 12,
  },
  audioPlayerText: { marginLeft: 12, color: '#3b82f6', fontWeight: 'bold' },
  emptyText: { color: '#94a3b8', fontStyle: 'italic' },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginTop: 16 },
  errorSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  backBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backBtnText: { color: 'white', fontWeight: 'bold' },
});
