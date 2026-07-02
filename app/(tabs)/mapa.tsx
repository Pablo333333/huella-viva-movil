import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useTickets } from '@/features/tickets/hooks/use-tickets';
import { useWorkflowStates } from '@/features/catalog/hooks/use-catalog';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { DocumentoVivo } from '@/components/DocumentoVivo';

export default function MapScreen() {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  const { data: tickets, isLoading } = useTickets();
  const { data: states } = useWorkflowStates();

  const allMarkers = useMemo(() => {
    return (tickets || [])
      .filter(t => t.latitude && t.longitude)
      .filter(m => !statusFilter || m.statusId === statusFilter);
  }, [tickets, statusFilter]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Mapa de Tickets' }} />
      
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
            key={marker.id}
            coordinate={{ latitude: marker.latitude!, longitude: marker.longitude! }}
            pinColor="#3b82f6"
          >
            <Callout onPress={() => setSelectedEntityId(marker.id)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{marker.title || marker.type || 'Ticket'}</Text>
                <Text style={styles.calloutSubtitle}>{marker.statusName}</Text>
                <Text style={styles.calloutLink}>Toca para ver Documento Vivo</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Modal para Documento Vivo */}
      <Modal
        visible={!!selectedEntityId}
        animationType="slide"
        onRequestClose={() => setSelectedEntityId(null)}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Documento Vivo</Text>
            <TouchableOpacity onPress={() => setSelectedEntityId(null)}>
              <MaterialCommunityIcons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>
          {selectedEntityId && (
            <DocumentoVivo entityId={selectedEntityId} entityType="TICKET" />
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
