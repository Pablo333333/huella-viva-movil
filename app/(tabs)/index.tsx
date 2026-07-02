import React, { useMemo } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTickets } from '@/features/tickets/hooks/use-tickets';
import { useWorkflowStates } from '@/features/catalog/hooks/use-catalog';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const router = useRouter();
  const { data: tickets, isLoading: loadingTickets } = useTickets();
  const { data: states, isLoading: loadingStates } = useWorkflowStates();

  const stats = useMemo(() => {
    const all = tickets || [];
    const catalog = states || [];
    
    // Log para depuración profunda
    if (all.length > 0) {
      console.log('[Dashboard] --- DEPURACIÓN DE ESTADOS ---');
      console.log('[Dashboard] Total tickets:', all.length);
      console.log('[Dashboard] Primer ticket (ejemplo):', {
        id: all[0].id,
        title: all[0].title,
        statusName: all[0].statusName,
        statusId: (all[0] as any).statusId || (all[0] as any).workflowStateId
      });
      console.log('[Dashboard] Catálogo de estados:', catalog.map(s => ({ id: s.id, name: s.name })));
    }

    // Encontrar IDs de estados dinámicamente por nombre
    const nuevoState = catalog.find(s => s.name.toUpperCase() === 'NUEVO');
    const enProcesoState = catalog.find(s => s.name.toUpperCase() === 'EN_PROCESO');
    const completadoState = catalog.find(s => s.name.toUpperCase() === 'COMPLETADO');

    // Filtrado dinámico: preferimos comparar por ID si tenemos el catálogo, 
    // pero mantenemos el fallback por nombre para robustez.
    const filterByState = (ticket: any, targetState: any, targetName: string) => {
      const ticketStatusId = ticket.workflowStateId || ticket.statusId || ticket.workflow?.id || ticket.status?.id;
      const ticketStatusName = (
        ticket.statusName || 
        ticket.workflowState?.name || 
        ticket.status?.name || 
        ticket.workflow?.name
      )?.toUpperCase();
      
      if (targetState && ticketStatusId === targetState.id) return true;
      if (ticketStatusName === targetName) return true;
      return false;
    };

    const counts = {
      nuevos: all.filter(t => filterByState(t, nuevoState, 'NUEVO')).length,
      enProceso: all.filter(t => filterByState(t, enProcesoState, 'EN_PROCESO')).length,
      completados: all.filter(t => filterByState(t, completadoState, 'COMPLETADO')).length,
    };

    if (all.length > 0) {
      console.log('[Dashboard] Conteos finales:', counts);
      console.log('[Dashboard] ------------------------------');
    }

    return {
      ...counts,
      vencidos: all.filter(t => {
        const date = t.createdAt;
        const isToday = new Date(date).toDateString() === new Date().toDateString();
        const isNotCompleted = !filterByState(t, completadoState, 'COMPLETADO');
        return isToday && isNotCompleted;
      }).length
    };
  }, [tickets, states]);

  if (loadingTickets || loadingStates) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Dashboard de Control</Text>

        {/* Alertas Rojas */}
        {stats.vencidos > 0 && (
          <View style={styles.alertCard}>
            <MaterialCommunityIcons name="alert-circle" size={24} color="#fff" />
            <Text style={styles.alertText}>
              {stats.vencidos} {stats.vencidos === 1 ? 'Ticket vence' : 'Tickets vencen'} hoy
            </Text>
          </View>
        )}

        {/* Resumen Visual */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderLeftColor: '#fbbf24' }]}>
            <Text style={styles.statNumber}>{stats.nuevos}</Text>
            <Text style={styles.statLabel}>Nuevos</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#3b82f6' }]}>
            <Text style={styles.statNumber}>{stats.enProceso}</Text>
            <Text style={styles.statLabel}>En Proceso</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
            <Text style={styles.statNumber}>{stats.completados}</Text>
            <Text style={styles.statLabel}>Completados</Text>
          </View>
        </View>

        {/* Sección de Acciones Rápidas */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/tickets/new')}>
              <MaterialCommunityIcons name="plus-circle" size={32} color="#2563eb" />
              <Text style={styles.actionButtonText}>Nuevo Ticket</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/tickets/new')}>
              <MaterialCommunityIcons name="camera" size={32} color="#2563eb" />
              <Text style={styles.actionButtonText}>Escanear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
              <MaterialCommunityIcons name="microphone" size={32} color="#2563eb" />
              <Text style={styles.actionButtonText}>Voz</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Botón Flotante Central Grande */}
      <TouchableOpacity style={styles.fabMain} onPress={() => router.push('/tickets/new')}>
        <MaterialCommunityIcons name="plus" size={40} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1e293b',
  },
  alertCard: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  alertText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    width: '31%',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  quickActions: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#475569',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '31%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
  },
  fabMain: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#2563eb',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
});
