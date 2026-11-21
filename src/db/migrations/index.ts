import type { SQLiteDatabase } from 'expo-sqlite';

import { migration001Initial } from './001_initial';
import type { Migration } from './types';

/** Danh sách migration theo thứ tự. Thêm migration mới vào CUỐI, không sửa migration đã phát hành. */
export const MIGRATIONS: readonly Migration[] = [migration001Initial];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

export async function getSchemaVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * Chạy các migration còn thiếu. Mỗi migration chạy trong một transaction riêng:
 * lỗi giữa chừng thì rollback, phiên bản schema giữ nguyên.
 * @returns phiên bản schema sau khi chạy.
 */
export async function migrateDatabase(db: SQLiteDatabase): Promise<number> {
  let current = await getSchemaVersion(db);

  if (current > LATEST_SCHEMA_VERSION) {
    throw new Error(
      `Dữ liệu trên máy (phiên bản ${current}) mới hơn ứng dụng (phiên bản ${LATEST_SCHEMA_VERSION}). Hãy cập nhật ứng dụng.`,
    );
  }

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.withExclusiveTransactionAsync(async (txn) => {
      await migration.up(txn);
      await txn.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
    current = migration.version;
  }

  return current;
}
