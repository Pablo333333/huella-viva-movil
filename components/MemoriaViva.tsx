import React from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { Activity, Commitment } from '@/features/activities/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'expo-router';

interface Props {
  activities: Activity[];
  isLoading?: boolean;
}

export const MemoriaViva: React.FC<Props> = ({ activities, isLoading }) => {
  const router = useRouter();

  const renderCommitment = (commitment: Commitment) => (
    <View key={commitment.id} style={styles.commitmentItem}>
      <MaterialCommunityIcons 
        name={commitment.estado === 'CUMPLIDO' ? "check-circle" : "clock-outline"} 
        size={16} 
        color={commitment.estado === 'CUMPLIDO' ? "#10b981" : "#f59e0b"} 
      />
      <View style={styles.commitmentTextContainer}>
        <Text style={styles.commitmentDesc}>{commitment.descripcion}</Text>
        <Text style={styles.commitmentMeta}>
          Resp: {commitment.responsable} • {commitment.fecha_cumplimiento ? format(new Date(commitment.fecha_cumplimiento), 'dd MMM', { locale: es }) : 'Sin fecha'}
        </Text>
      </View>
    </View>
  );

  const renderActivity = ({ item, index }: { item: Activity, index: number }) => {
    const activityDate = new Date(item.fecha);
    const isLast = index === activities.length - 1;

    return (
      <View style={styles.activityContainer}>
        {/* Timeline Line */}
        <View style={styles.timelineContainer}>
          <View style={[styles.dot, { backgroundColor: getActivityColor(item.tipo) }]} />
          {!isLast && <View style={styles.line} />}
        </View>

        {/* Content Card */}
        <TouchableOpacity 
          style={styles.card}
          onPress={() => router.push(`/(tabs)/memoria/${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.typeTag, { backgroundColor: getActivityColor(item.tipo) + '20' }]}>
              <Text style={[styles.typeTagText, { color: getActivityColor(item.tipo) }]}>{item.tipo}</Text>
            </View>
            <Text style={styles.dateText}>
              {format(activityDate, "d 'de' MMMM, yyyy", { locale: es })}
            </Text>
          </View>

          <Text style={styles.description}>{item.descripcion}</Text>

          {item.fotoUrl && (
            <Image source={{ uri: item.fotoUrl }} style={styles.activityImage} />
          )}

          {item.audioUrl && (
            <View style={styles.audioPreview}>
              <MaterialCommunityIcons name="play-circle" size={24} color="#3b82f6" />
              <Text style={styles.audioText}>Nota de voz de Terra Voz</Text>
            </View>
          )}

          {item.commitments && item.commitments.length > 0 && (
            <View style={styles.commitmentsSection}>
              <Text style={styles.commitmentsTitle}>Compromisos ({item.commitments.length})</Text>
              {item.commitments.map(renderCommitment)}
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text>Cargando Memoria Viva...</Text>
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="text-box-remove-outline" size={64} color="#e5e7eb" />
        <Text style={styles.emptyText}>No hay registros en esta bitácora todavía.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={activities}
      renderItem={renderActivity}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'REUNION': return '#3b82f6';
    case 'INSPECCION': return '#8b5cf6';
    case 'VISITA': return '#10b981';
    case 'TALLER': return '#f59e0b';
    default: return '#6b7280';
  }
};

const styles = StyleSheet.create({
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  activityContainer: {
    flexDirection: 'row',
  },
  timelineContainer: {
    width: 20,
    alignItems: 'center',
    marginRight: 15,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
    marginTop: 20,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: -5,
  },
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  activityImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: 12,
  },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  audioText: {
    marginLeft: 10,
    fontSize: 13,
    color: '#4b5563',
  },
  commitmentsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  commitmentsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  commitmentItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  commitmentTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  commitmentDesc: {
    fontSize: 13,
    color: '#4b5563',
  },
  commitmentMeta: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
