import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Modal } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useTramites } from '../../src/features/tramites/hooks/use-tramites';
import { useTickets } from '../../src/features/tickets/hooks/use-tickets';
import { useWorkflowStates } from '../../src/features/catalog/hooks/use-catalog';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { DocumentoVivo } from '../../src/components/DocumentoVivo';

export default function MapScreen() {
  const [selectedEntity, setSelectedEntity] = useState<{ id: string, type: 'TICKET' | 'TRAMITE' } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  const { data: tramites } = useTramites();
  const { data: tickets } = useTickets();
  const { data: states } = useWorkflowStates();

  const allMarkers = useMemo(() => {
    const tramiteMarkers = (tramites || [])
      .filter(t => t.latitude && t.longitude)
      .map(t => ({ ...t, markerType: 'TRAMITE' as const }));
    
    const ticketMarkers = (tickets || [])
      .filter(t => t.latitude && t.longitude)
      .map(t => ({ ...t, markerType: 'TICKET' as const }));

    return [...tramiteMarkers, ...ticketMarkers].filter(m => !statusFilter || m.estadoId === statusFilter || (m as any).workflowStateId === statusFilter);
  }, [tramites, tickets, statusFilter]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Mapa de Tareas' }} />
      
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -12.046374,
          longitude: -77.042793,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {allMarkers.map((marker) => (
          <Marker
            key={`${marker.markerType}-${marker.id}`}
            coordinate={{ latitude: marker.latitude!, longitude: marker.longitude! }}
            pinColor={marker.markerType === 'TICKET' ? '#3b82f6' : '#10b981'}
          >
            <Callout onPress={() => setSelectedEntity({ id: marker.id, type: marker.markerType })}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{(marker as any).title || marker.tipo}</Text>
                <Text style={styles.calloutSubtitle}>{marker.statusName || (marker as any).statusName}</Text>
                <Text style={styles.calloutLink}>Toca para ver Documento Vivo</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Modal para Documento Vivo */}
      <Modal
        visible={!!selectedEntity}
        animationType="slide"
        onRequestClose={() => setSelectedEntity(null)}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Documento Vivo</Text>
            <TouchableOpacity onPress={() => setSelectedEntity(null)}>
              <MaterialCommunityIcons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>
          {selectedEntity && (
            <DocumentoVivo entityId={selectedEntity.id} entityType={selectedEntity.type} />
          )}
        </SafeAreaView>
      </Modal>

      {/* Filtro Flotante */}
      <View style={styles.filterFab}>
        <MaterialCommunityIcons name="filter" size={20} color="white" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  callout: { width: 200, padding: 8 },
  calloutTitle: { fontWeight: 'bold', fontSize: 14 },
  calloutSubtitle: { fontSize: 12, color: '#6b7280', marginVertical: 2 },
  calloutLink: { fontSize: 10, color: '#3b82f6', fontWeight: 'bold', marginTop: 4 },
  modalHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' 
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  filterFab: {
    position: 'absolute', right: 20, bottom: 20, backgroundColor: '#3b82f6',
    width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3.84
  }
});
