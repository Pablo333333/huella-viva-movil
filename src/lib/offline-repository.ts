import NetInfo from '@react-native-community/netinfo';
import { getDatabase } from './database';
import api from './api';

export interface PendingAction {
  id: number;
  action_type: string;
  entity_type: string;
  entity_id: string;
  payload: string;
}

export class OfflineRepository {
  static async executeAction(
    actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE',
    entityType: 'Ticket',
    entityId: string | null,
    payload: any,
    apiCall: () => Promise<any>
  ) {
    const state = await NetInfo.fetch();
    const db = await getDatabase();

    if (!db) {
      console.error('Database not available for offline action');
      return await apiCall();
    }

    if (state.isConnected && state.isInternetReachable) {
      try {
        const result = await apiCall();
        // Si la llamada a la API tiene éxito, podríamos actualizar el cache local aquí si fuera necesario
        return result;
      } catch (error) {
        console.error('API call failed, falling back to offline mode:', error);
        await this.savePendingAction(db, actionType, entityType, entityId, payload);
        return { offline: true, error: 'API_FAILED' };
      }
    } else {
      // Offline mode
      await this.savePendingAction(db, actionType, entityType, entityId, payload);
      return { offline: true };
    }
  }

  private static async savePendingAction(db: any, actionType: string, entityType: string, entityId: string | null, payload: any) {
    await db.runAsync(
      'INSERT INTO pending_actions (action_type, entity_type, entity_id, payload) VALUES (?, ?, ?, ?)',
      [actionType, entityType, entityId, JSON.stringify(payload)]
    );
    console.log(`Action ${actionType} for ${entityType} saved for later synchronization.`);
  }

  static async getPendingActionsCount(): Promise<number> {
    const db = await getDatabase();
    if (!db) return 0;
    const result: any = await db.getFirstAsync('SELECT COUNT(*) as count FROM pending_actions WHERE sync_pending = 1');
    return result?.count || 0;
  }

  static async syncPendingActions() {
    const state = await NetInfo.fetch();
    if (!state.isConnected || !state.isInternetReachable) return;

    const db = await getDatabase();
    if (!db) return;
    const pendingActions: PendingAction[] = await db.getAllAsync(
      'SELECT * FROM pending_actions WHERE sync_pending = 1 ORDER BY created_at ASC'
    );

    if (pendingActions.length === 0) return;

    console.log(`Starting synchronization of ${pendingActions.length} pending actions...`);

    for (const action of pendingActions) {
      try {
        const payload = JSON.parse(action.payload);
        
        // Lógica de sincronización basada en el tipo de entidad y acción
        if (action.entity_type === 'Ticket') {
          if (action.action_type === 'CREATE') {
            await api.post('/tickets', payload);
          } else if (action.action_type === 'STATUS_CHANGE') {
            await api.patch(`/tickets/${action.entity_id}/status`, payload);
          }
        }

        // Marcar como sincronizado o eliminar
        await db.runAsync('DELETE FROM pending_actions WHERE id = ?', [action.id]);
        console.log(`Action ${action.id} synchronized successfully.`);
      } catch (error) {
        console.error(`Failed to synchronize action ${action.id}:`, error);
        // Si falla, lo dejamos para el próximo intento
        break; 
      }
    }
  }
}
