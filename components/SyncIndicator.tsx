import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { OfflineRepository } from '@/lib/offline-repository';

export const SyncIndicator = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected || !state.isInternetReachable);
      if (state.isConnected && state.isInternetReachable) {
        OfflineRepository.syncPendingActions().then(updateCount);
      }
    });

    const updateCount = () => {
      OfflineRepository.getPendingActionsCount().then(setPendingCount);
    };

    updateCount();
    const interval = setInterval(updateCount, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const hasPending = pendingCount > 0;

  if (!isOffline && !hasPending) return null;

  const handleSync = () => {
    if (!isOffline) {
      OfflineRepository.syncPendingActions().then(() => {
        OfflineRepository.getPendingActionsCount().then(setPendingCount);
      });
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        isOffline ? styles.offline : styles.pending
      ]}
      onPress={handleSync}
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
