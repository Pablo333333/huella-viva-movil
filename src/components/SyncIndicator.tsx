import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSync } from '@/features/notifications/hooks/use-sync';

export const SyncIndicator = () => {
  const { isOffline, hasPending, pendingCount, sync } = useSync();

  if (!isOffline && !hasPending) return null;

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        isOffline ? styles.offline : styles.pending
      ]}
      onPress={sync}
      disabled={isOffline}
    >
      <Ionicons 
        name={isOffline ? "cloud-offline-outline" : "sync-outline"} 
        size={18} 
        color="white" 
      />
      <Text style={styles.text}>
        {isOffline 
          ? "Modo Offline" 
          : `${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}`}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  offline: {
    backgroundColor: '#6c757d',
  },
  pending: {
    backgroundColor: '#007bff',
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});
