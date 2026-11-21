import type { SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  /** Số phiên bản tăng dần, khớp với PRAGMA user_version sau khi chạy xong. */
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}
