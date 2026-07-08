import * as SQLite from 'expo-sqlite';

const dbName = 'kontrolia.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const initDatabase = async () => {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
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
    `);
    
    dbInstance = db;
    return db;
  })();

  return initPromise;
};

export const getDatabase = async () => {
  return initDatabase();
};
