import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTramite } from '../../src/features/tramites/hooks/use-tramites';
import { DocumentoVivo } from '../../src/components/DocumentoVivo';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TramiteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: tramite, isLoading } = useTramite(id);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="loading" size={40} color="#3b82f6" />
      </View>
    );
  }

  if (!tramite) {
    return (
      <View style={styles.centered}>
        <Text>Trámite no encontrado</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: tramite.tipo,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="black" />
            </TouchableOpacity>
          )
        }} 
      />
      
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{tramite.estadoName}</Text>
        </View>
        <Text style={styles.title}>{tramite.tipo}</Text>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="account-arrow-right" size={16} color="#6b7280" />
          <Text style={styles.metaText}>Para: {tramite.destinatarioName}</Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color="#6b7280" />
          <Text style={styles.metaText}>Límite: {tramite.fechaLimite ? new Date(tramite.fechaLimite).toLocaleDateString() : 'Sin fecha'}</Text>
        </View>
      </View>

      <DocumentoVivo entityId={id} entityType="TRAMITE" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  badge: { 
    backgroundColor: '#3b82f6', alignSelf: 'flex-start', 
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 8 
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaText: { marginLeft: 6, fontSize: 13, color: '#6b7280' }
});
