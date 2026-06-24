import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { useTramites, useChangeTramiteStatus } from '../features/tramites/hooks/use-tramites';
import { useWorkflowStates } from '../features/catalog/hooks/use-catalog'; // I need to verify if this exists in mobile
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width * 0.8;

export const KanbanBoard = () => {
  const router = useRouter();
  const { data: tramites, isLoading: loadingTramites } = useTramites();
  // Need to verify catalog hooks in mobile
  const { data: states, isLoading: loadingStates } = useWorkflowStates();

  const columns = useMemo(() => {
    if (!states || !tramites) return [];
    return states.map(state => ({
      id: state.id,
      name: state.name,
      items: tramites.filter(t => t.estadoId === state.id)
    }));
  }, [states, tramites]);

  const renderItem = ({ item, drag, isActive }: RenderItemParams<any>) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.item,
            { backgroundColor: isActive ? '#e0e7ff' : 'white' }
          ]}
          onPress={() => router.push(`/tramites/${item.id}`)}
        >
          <View style={styles.itemHeader}>
            <Text style={styles.itemType}>{item.tipo}</Text>
            <MaterialCommunityIcons name="drag-vertical" size={20} color="#9ca3af" />
          </View>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.tipo} para {item.destinatarioName}
          </Text>
          <View style={styles.itemFooter}>
            <Text style={styles.itemUser}>{item.remitenteName}</Text>
            <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  if (loadingTramites || loadingStates) {
    return <View style={styles.centered}><Text>Cargando Kanban...</Text></View>;
  }

  return (
    <ScrollView horizontal pagingEnabled snapToInterval={COLUMN_WIDTH + 20} decelerationRate="fast" style={styles.container}>
      {columns.map((column) => (
        <View key={column.id} style={styles.column}>
          <View style={styles.columnHeader}>
            <Text style={styles.columnTitle}>{column.name}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{column.items.length}</Text>
            </View>
          </View>
          
          <DraggableFlatList
            data={column.items}
            onDragEnd={({ data }) => {
              // En un Kanban real, mover dentro de la misma columna no cambia estado
              // Pero si arrastramos a otra columna (que DraggableFlatList no soporta nativamente entre listas)
              // Para mobile MVP, permitiremos reordenar y quizás un botón para mover de columna
            }}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            containerStyle={styles.listContainer}
          />
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  column: { 
    width: COLUMN_WIDTH, marginHorizontal: 10, marginVertical: 16, 
    backgroundColor: '#e5e7eb', borderRadius: 16, padding: 12 
  },
  columnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  columnTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  countBadge: { backgroundColor: '#9ca3af', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  listContainer: { flex: 1 },
  item: { 
    padding: 12, borderRadius: 12, marginBottom: 12, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemType: { fontSize: 10, fontWeight: 'bold', color: '#3b82f6', textTransform: 'uppercase' },
  itemTitle: { fontSize: 14, fontWeight: '500', color: '#1f2937' },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  itemUser: { fontSize: 10, color: '#6b7280' },
  itemDate: { fontSize: 10, color: '#9ca3af' }
});
