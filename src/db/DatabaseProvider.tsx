import type { SQLiteDatabase } from 'expo-sqlite';
import { createContext, useContext, type ReactNode } from 'react';

const DatabaseContext = createContext<SQLiteDatabase | null>(null);

export interface DatabaseProviderProps {
  db: SQLiteDatabase;
  children: ReactNode;
}

/** Cung cấp kết nối SQLite đã mở và đã chạy migration cho toàn app. */
export function DatabaseProvider({ db, children }: DatabaseProviderProps) {
  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): SQLiteDatabase {
  const db = useContext(DatabaseContext);
  if (!db) {
    throw new Error('useDatabase() phải được dùng bên trong <DatabaseProvider>.');
  }
  return db;
}
