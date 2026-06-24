import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { useTramites } from '../../src/features/tramites/hooks/use-tramites';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TramitesListScreen() {
  const { data: tramites, isLoading, refetch } = useTramites();
  const router = useRouter();

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/tramites/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.typeRow}>
          <MaterialCommunityIcons name="file-document-outline" size={20} color="#3b82f6" />
          <Text style={styles.typeText}>{item.tipo}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estadoName) }]}>
          <Text style={styles.statusText}>{item.estadoName}</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.senderText}>De: {item.remitenteName}</Text>
        <Text style={styles.receiverText}>Para: {item.destinatarioName}</Text>
      </View>
      
      <View style={styles.cardFooter}>
        <MaterialCommunityIcons name="calendar" size={14} color="#9ca3af" />
        <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'NUEVO': return '#fbbf24';
      case 'EN_PROCESO': return '#3b82f6';
      case 'COMPLETADO': return '#10b981';
      case 'CERRADO': return '#78716c';
      default: return '#9ca3af';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Mis Trámites',
        headerRight: () => (
          <View style={{ flexDirection: 'row', marginRight: 16, gap: 12 }}>
            <TouchableOpacity onPress={() => router.push('/mapa')}>
              <MaterialCommunityIcons name="map-marker-radius" size={24} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/tramites/kanban')}>
              <MaterialCommunityIcons name="view-column" size={24} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        )
      }} />
      <FlatList
        data={tramites}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          !isLoading && <Text style={styles.emptyText}>No tienes trámites pendientes.</Text>
        }
      />
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/tramites/new')}
      >
        <MaterialCommunityIcons name="plus" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  list: { padding: 16 },
  card: { 
    backgroundColor: 'white', borderRadius: 12, padding: 16, 
    marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  typeRow: { flexDirection: 'row', alignItems: 'center' },
  typeText: { marginLeft: 8, fontWeight: 'bold', fontSize: 16 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  cardBody: { marginBottom: 12 },
  senderText: { fontSize: 13, color: '#4b5563' },
  receiverText: { fontSize: 13, color: '#4b5563', marginTop: 2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8 },
  dateText: { marginLeft: 4, fontSize: 12, color: '#9ca3af' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#6b7280' },
  fab: { 
    position: 'absolute', right: 20, bottom: 20, backgroundColor: '#3b82f6', 
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center', 
    alignItems: 'center', elevation: 4, shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84
  }
});
