import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { LiveMap } from '@/components/LiveMap';
import { TerraVozCapture } from '@/components/TerraVozCapture';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDefaultCommunity } from '@/features/communities/hooks/use-communities';
import { TerraVozResponse } from '@/features/terra-voz/services/terra-voz.service';

export default function MapScreen() {
  const [showTerraVoz, setShowTerraVoz] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const { communityId, isLoading } = useDefaultCommunity();

  const handleSuccess = (_result: TerraVozResponse) => {
    setShowTerraVoz(false);
    setMapKey((k) => k + 1);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Mapa Vivo Territorial',
          headerShown: false,
        }}
      />
      <LiveMap key={mapKey} />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowTerraVoz(true)}
        accessibilityLabel="Abrir Terra Voz"
      >
        <MaterialCommunityIcons name="microphone" size={28} color="white" />
      </TouchableOpacity>

      <Modal visible={showTerraVoz} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TerraVozCapture
            communityId={communityId}
            onSuccess={handleSuccess}
            onCancel={() => setShowTerraVoz(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  fab: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    backgroundColor: '#ef4444',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
});
