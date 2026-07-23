import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActivities } from '@/features/activities/hooks/use-activities';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MemoriaViva } from '@/components/MemoriaViva';

export default function MemoriaVivaScreen() {
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const { data: activities, isLoading, refetch } = useActivities({ type: typeFilter });

  const filters = [
    { label: 'Todos', value: undefined, icon: 'filter-variant' },
    { label: 'Reuniones', value: 'REUNION', icon: 'account-group' },
    { label: 'Visitas', value: 'VISITA', icon: 'map-marker-check' },
    { label: 'Inspecciones', value: 'INSPECCION', icon: 'clipboard-check' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Barra de Filtros */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.label}
              style={[
                styles.filterChip,
                typeFilter === f.value && styles.filterChipActive
              ]}
              onPress={() => setTypeFilter(f.value)}
            >
              <MaterialCommunityIcons 
                name={f.icon as any} 
                size={16} 
                color={typeFilter === f.value ? 'white' : '#64748b'} 
              />
              <Text style={[
                styles.filterChipText,
                typeFilter === f.value && styles.filterChipTextActive
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <MemoriaViva 
        activities={activities || []} 
        isLoading={isLoading} 
      />

      {/* Botón Flotante para refrescar (en lugar de Pull to refresh que a veces falla en timeline) */}
      <TouchableOpacity 
        style={styles.refreshFab}
        onPress={() => refetch()}
      >
        <MaterialCommunityIcons name="refresh" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
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
  }
});
