import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTickets } from '@/features/tickets/hooks/use-tickets';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TicketsListScreen() {
  const { data: tickets, isLoading, refetch } = useTickets();
  const router = useRouter();

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => {
        if (item.id) {
          router.push(`/tickets/${item.id}`);
        }
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.typeRow}>
          <MaterialCommunityIcons name="file-document-outline" size={20} color="#3b82f6" />
          <Text style={styles.typeText}>{item.title || item.type || 'Ticket'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.statusName || item.workflowState?.name || item.status?.name) }]}>
          <Text style={styles.statusText}>{item.statusName || item.workflowState?.name || item.status?.name || 'N/A'}</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        {item.description && <Text style={styles.descriptionText} numberOfLines={2}>{item.description}</Text>}
        <Text style={styles.senderText}>De: {item.remitenteName || 'Sistema'}</Text>
        <Text style={styles.receiverText}>Para: {item.destinatarioName || 'Asignado'}</Text>
      </View>
      
      <View style={styles.cardFooter}>
        <MaterialCommunityIcons name="calendar" size={14} color="#9ca3af" />
        <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status?: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'NUEVO': return '#fbbf24';
      case 'EN_PROCESO': return '#3b82f6';
      case 'COMPLETADO': return '#10b981';
      case 'CERRADO': return '#78716c';
      default: return '#9ca3af';
    }
  };

  if (tickets && tickets.length > 0) {
    console.log('[TicketsList] Primer ticket recibido:', JSON.stringify(tickets[0], null, 2));
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Mis Tickets',
        headerRight: () => (
          <View style={{ flexDirection: 'row', marginRight: 16, gap: 12 }}>
            <TouchableOpacity onPress={() => router.push('/mapa')}>
              <MaterialCommunityIcons name="map-marker-radius" size={24} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        )
      }} />
      <FlatList
        data={tickets}
        renderItem={renderItem}
        keyExtractor={(item) => (item?.id ? item.id.toString() : Math.random().toString())}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.emptyText}>No tienes tickets pendientes.</Text>
          )
        }
      />
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/tickets/new')}
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
  descriptionText: { fontSize: 14, color: '#1f2937', marginBottom: 8 },
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
