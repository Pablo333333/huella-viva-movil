import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { OfflineRepository } from '@/lib/offline-repository';

export const useSync = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const checkPending = async () => {
    const count = await OfflineRepository.getPendingActionsCount();
    setPendingCount(count);
  };

  useEffect(() => {
    // Suscribirse a cambios de red
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(!!offline);

      if (!offline) {
        // Si vuelve la conexión, intentar sincronizar
        OfflineRepository.syncPendingActions().then(() => {
          checkPending();
        });
      }
    });

    // Verificación inicial
    checkPending();

    // Intervalo de seguridad para verificar pendientes
    const interval = setInterval(checkPending, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    isOffline,
    pendingCount,
    hasPending: pendingCount > 0,
    sync: () => OfflineRepository.syncPendingActions().then(checkPending)
  };
};
