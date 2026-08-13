import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LiveMap } from '@/components/LiveMap';
import { TerraVozCapture } from '@/components/TerraVozCapture';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUserCommunity } from '@/features/communities/hooks/use-communities';
import { TerraVozResponse } from '@/features/terra-voz/services/terra-voz.service';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { isCommunityRole } from '@/features/auth/roles';

export default function MapScreen() {
  const [showTerraVoz, setShowTerraVoz] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const { user } = useAuth();
  const { communityId } = useUserCommunity();

  const handleSuccess = (_result: TerraVozResponse) => {
    setShowTerraVoz(false);
    setMapKey((k) => k + 1);
  };

  return (
    <View style={styles.container}>
      <LiveMap key={mapKey} />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowTerraVoz(true)}
        accessibilityLabel="Abrir Terra Voz"
      >
        <MaterialCommunityIcons name="microphone" size={22} color="white" />
      </TouchableOpacity>

      <Modal visible={showTerraVoz} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TerraVozCapture
            communityId={isCommunityRole(user?.role) ? communityId : undefined}
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
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 16,
    right: 16,
    backgroundColor: '#ef4444',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
});
