import { getDatabase } from './database';

export const logError = async (error: any, stack?: string) => {
  try {
    const db = await getDatabase();
    const message = error instanceof Error ? error.message : String(error);
    const errorStack = stack || (error instanceof Error ? error.stack : '');
    
    console.log('[PersistentLogger] Logging error to DB:', message);
    
    await db.runAsync(
      'CREATE TABLE IF NOT EXISTS app_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, message TEXT, stack TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)'
    );
    
    await db.runAsync(
      'INSERT INTO app_logs (message, stack) VALUES (?, ?)',
      [message, errorStack]
    );
  } catch (e) {
    console.error('[PersistentLogger] Failed to log error to DB:', e);
  }
};

export const getLogs = async () => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync('SELECT * FROM app_logs ORDER BY timestamp DESC LIMIT 50');
  } catch (e) {
    console.error('[PersistentLogger] Failed to get logs:', e);
    return [];
  }
};

export const clearLogs = async () => {
  try {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM app_logs');
  } catch (e) {
    console.error('[PersistentLogger] Failed to clear logs:', e);
  }
};
