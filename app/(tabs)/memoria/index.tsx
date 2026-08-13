import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActivities } from '@/features/activities/hooks/use-activities';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MemoriaViva } from '@/components/MemoriaViva';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { isCommunityRole } from '@/features/auth/roles';
import { useUserCommunity } from '@/features/communities/hooks/use-communities';

export default function MemoriaVivaScreen() {
  const { user } = useAuth();
  const isCommunity = isCommunityRole(user?.role);
  const { communityId } = useUserCommunity();
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [estadoFilter, setEstadoFilter] = useState<string | undefined>(undefined);

  const scopeFilters = useMemo(() => {
    if (isCommunity) {
      return {
        ...(communityId ? { communityId } : {}),
        ...(user?.id ? { userId: user.id } : {}),
      };
    }
    return {};
  }, [isCommunity, communityId, user?.id]);

  const listFilters = useMemo(
    () => ({
      ...scopeFilters,
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(estadoFilter ? { estado: estadoFilter } : {}),
    }),
    [scopeFilters, typeFilter, estadoFilter],
  );

  const { data: allActivities } = useActivities(scopeFilters);
  const { data: activities, isLoading, refetch } = useActivities(listFilters);

  const filters: { label: string; value?: string; icon: string; kind?: 'estado' | 'type' }[] = [
    { label: 'Todos', value: undefined, icon: 'filter-variant' },
    { label: 'Ejecutadas', value: 'EJECUTADA', icon: 'check-circle', kind: 'estado' },
    { label: 'Programadas', value: 'PROGRAMADA', icon: 'calendar-clock', kind: 'estado' },
    { label: 'Reuniones', value: 'REUNION', icon: 'account-group', kind: 'type' },
    { label: 'Visitas', value: 'VISITA', icon: 'map-marker-check', kind: 'type' },
    { label: 'Inspecciones', value: 'INSPECCION', icon: 'clipboard-check', kind: 'type' },
    { label: 'Talleres', value: 'TALLER', icon: 'school', kind: 'type' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {allActivities?.length || 0} actividades
          {isCommunity ? ' de tu comunidad' : ' en el territorio'}
        </Text>
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filters.map((f) => {
            const active =
              f.value === undefined
                ? !typeFilter && !estadoFilter
                : f.kind === 'estado'
                  ? estadoFilter === f.value && !typeFilter
                  : typeFilter === f.value && !estadoFilter;
            return (
              <TouchableOpacity
                key={f.label}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => {
                  if (!f.value) {
                    setTypeFilter(undefined);
                    setEstadoFilter(undefined);
                    return;
                  }
                  if (f.kind === 'estado') {
                    setEstadoFilter(f.value);
                    setTypeFilter(undefined);
                  } else {
                    setTypeFilter(f.value);
                    setEstadoFilter(undefined);
                  }
                }}
              >
                <MaterialCommunityIcons
                  name={f.icon as any}
                  size={16}
                  color={active ? 'white' : '#64748b'}
                />
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <MemoriaViva
        activities={activities || []}
        isLoading={isLoading}
        totalCount={allActivities?.length}
      />

      <TouchableOpacity style={styles.refreshFab} onPress={() => refetch()}>
        <MaterialCommunityIcons name="refresh" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  summaryBar: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  filterBar: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: 'white',
  },
  refreshFab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#3b82f6',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
