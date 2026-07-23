import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TerraVozCapture } from '@/components/TerraVozCapture';
import { useDashboardMetrics } from '@/features/activities/hooks/use-dashboard';
import { useDefaultCommunity } from '@/features/communities/hooks/use-communities';

export default function DashboardScreen() {
  const { data: dashboardData, isLoading: loadingMetrics, refetch } = useDashboardMetrics();
  const { communityId } = useDefaultCommunity();
  const [showTerraVoz, setShowTerraVoz] = useState(false);

  if (loadingMetrics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const { kpis, distribution } = dashboardData || { 
    kpis: { totalActivities: 0, totalCommunities: 0, confidenceIndex: 0, totalCommitments: 0, fulfilledCommitments: 0 },
    distribution: [] 
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Impacto Territorial</Text>

        {/* Índice de Confianza Card */}
        <View style={styles.confidenceCard}>
          <View style={styles.confidenceHeader}>
            <View>
              <Text style={styles.confidenceLabel}>Índice de Confianza</Text>
              <Text style={styles.confidenceValue}>{kpis.confidenceIndex}%</Text>
            </View>
            <MaterialCommunityIcons name="shield-check" size={40} color="#10b981" />
          </View>
          <View style={styles.confidenceProgressContainer}>
            <View style={[styles.confidenceProgressBar, { width: `${kpis.confidenceIndex}%` }]} />
          </View>
          <Text style={styles.confidenceSubtext}>
            {kpis.fulfilledCommitments} de {kpis.totalCommitments} compromisos cumplidos
          </Text>
        </View>

        {/* Resumen Visual */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderLeftColor: '#3b82f6' }]}>
            <Text style={styles.statNumber}>{kpis.totalActivities}</Text>
            <Text style={styles.statLabel}>Actividades</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
            <Text style={styles.statNumber}>{kpis.totalCommunities}</Text>
            <Text style={styles.statLabel}>Comunidades</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#8b5cf6' }]}>
            <Text style={styles.statNumber}>{kpis.fulfilledCommitments}</Text>
            <Text style={styles.statLabel}>Hitos</Text>
          </View>
        </View>

        {/* Distribución de Actividades */}
        <View style={styles.distributionSection}>
          <Text style={styles.sectionTitle}>Gestión por Tipo</Text>
          {distribution.map((item: any) => (
            <View key={item.name} style={styles.distItem}>
              <View style={styles.distHeader}>
                <Text style={styles.distName}>{item.name}</Text>
                <Text style={styles.distValue}>{item.value}</Text>
              </View>
              <View style={styles.distBarBg}>
                <View style={[
                  styles.distBarFill, 
                  { 
                    width: kpis.totalActivities > 0 ? `${(item.value / kpis.totalActivities) * 100}%` : '0%',
                    backgroundColor: item.name === 'REUNION' ? '#3b82f6' : item.name === 'VISITA' ? '#10b981' : '#f59e0b'
                  }
                ]} />
              </View>
            </View>
          ))}
        </View>

        {/* Botón Central Terra Voz */}
        <View style={styles.centerActionContainer}>
          <TouchableOpacity 
            style={styles.mainActionButton} 
            onPress={() => setShowTerraVoz(true)}
            activeOpacity={0.8}
          >
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="microphone" size={48} color="#fff" />
            </View>
            <Text style={styles.mainActionText}>Terra Voz</Text>
            <Text style={styles.mainActionSubtext}>Captura inteligente por voz</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showTerraVoz}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <TerraVozCapture 
              communityId={communityId} 
              onSuccess={() => {
                setShowTerraVoz(false);
                refetch();
              }}
              onCancel={() => setShowTerraVoz(false)}
            />
          </View>
        </Modal>
      </ScrollView>
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
    flexGrow: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1e293b',
  },
  confidenceCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  confidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  confidenceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  confidenceProgressContainer: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    marginBottom: 10,
    overflow: 'hidden',
  },
  confidenceProgressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 5,
  },
  confidenceSubtext: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
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
  distributionSection: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
  },
  distItem: {
    marginBottom: 15,
  },
  distHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  distName: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  distValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  distBarBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  distBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  centerActionContainer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  mainActionButton: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 300,
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconCircle: {
    backgroundColor: '#2563eb',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainActionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  mainActionSubtext: {
    fontSize: 12,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
});
