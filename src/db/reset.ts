import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDatabase } from '@/db/migrations';
import { seedSampleData } from '@/db/seed';

export interface ResetOptions {
  /** true: nạp lại dữ liệu mẫu sau khi xóa. */
  seed: boolean;
}

/**
 * Xóa toàn bộ bảng rồi tạo lại schema — CHỈ dùng khi phát triển.
 * (Chức năng "Xóa toàn bộ dữ liệu" cho người dùng thật sẽ làm riêng ở Milestone 5, kèm xóa file & thông báo.)
 */
export async function resetDatabase(db: SQLiteDatabase, options: ResetOptions): Promise<void> {
  if (!__DEV__) {
    throw new Error('resetDatabase chỉ được dùng trong môi trường phát triển.');
  }

  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    [],
  );

  await db.execAsync('PRAGMA foreign_keys = OFF');
  try {
    for (const { name } of tables) {
      await db.execAsync(`DROP TABLE IF EXISTS "${name.replace(/"/g, '""')}"`);
    }
    await db.execAsync('PRAGMA user_version = 0');
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON');
  }

  await migrateDatabase(db);
  if (options.seed) {
    await seedSampleData(db);
  }
}
