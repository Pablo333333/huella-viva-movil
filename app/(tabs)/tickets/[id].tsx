import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTicket } from '@/features/tickets/hooks/use-tickets';
import { DocumentoVivo } from '@/components/DocumentoVivo';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  if (!id) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const { data: ticket, isLoading, error } = useTicket(id as string);

  useEffect(() => {
    if (!isLoading && !ticket && !error) {
      // Si no hay ticket y no está cargando, redirigir después de un breve mensaje
      console.log(`[TicketDetail] Ticket con ID ${id} no encontrado.`);
    }
  }, [ticket, isLoading, error, id]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Cargando ticket...</Text>
      </View>
    );
  }

  if (error || !ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Ticket no encontrado</Text>
          <Text style={styles.errorSubtitle}>El ticket que buscas no existe o ha sido eliminado.</Text>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => router.replace('/tickets/index')}
          >
            <Text style={styles.backBtnText}>Volver a Mis Tickets</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Detalle de Ticket',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="black" />
            </TouchableOpacity>
          )
        }} 
      />
      
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: getStatusColor(ticket.statusName || ticket.workflowState?.name || ticket.status?.name) }]}>
            <Text style={styles.badgeText}>{ticket.statusName || ticket.workflowState?.name || ticket.status?.name || 'N/A'}</Text>
          </View>
        </View>
        <Text style={styles.title}>{ticket.title || ticket.type || 'Ticket'}</Text>
        {ticket.description && <Text style={styles.description}>{ticket.description}</Text>}
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="account-arrow-right" size={16} color="#6b7280" />
          <Text style={styles.metaText}>Asignado: {ticket.destinatarioName || 'Pendiente'}</Text>
        </View>
      </View>

      <DocumentoVivo entityId={id as string} entityType="TICKET" />
    </SafeAreaView>
  );
}

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 16 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  badge: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  description: { fontSize: 14, color: '#4b5563', marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaText: { marginLeft: 6, fontSize: 13, color: '#6b7280' },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginTop: 16 },
  errorSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  backBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backBtnText: { color: 'white', fontWeight: 'bold' }
});
