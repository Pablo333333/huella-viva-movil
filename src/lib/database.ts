import * as SQLite from 'expo-sqlite';

const dbName = 'kontrolia.db';

export const initDatabase = async () => {
  const db = await SQLite.openDatabaseAsync(dbName);
  
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS pending_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      payload TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_pending INTEGER DEFAULT 1
    );
    
    CREATE TABLE IF NOT EXISTS local_tickets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status_name TEXT,
      category_name TEXT,
      latitude REAL,
      longitude REAL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_tramites (
      id TEXT PRIMARY KEY,
      tipo TEXT,
      remitente_id TEXT,
      destinatario_id TEXT,
      estado_id TEXT,
      estado_name TEXT,
      fecha_limite TEXT,
      created_at TEXT
    );
  `);
  
  return db;
};

export const getDatabase = async () => {
  return await SQLite.openDatabaseAsync(dbName);
};
