import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'pillpal.db';

/** Kiểu giá trị được phép truyền vào câu lệnh SQL. */
export type BindValue = string | number | null;

/**
 * Mở cơ sở dữ liệu trên máy và bật các thiết lập bắt buộc:
 * - WAL: ghi nhanh, an toàn khi app bị tắt đột ngột.
 * - foreign_keys: SQLite mặc định TẮT kiểm tra khóa ngoại, phải bật cho mỗi kết nối.
 */
export async function openAppDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return db;
}

/** SQLite lưu boolean dạng 0/1. */
export function toBool(value: number | null | undefined): boolean {
  return value === 1;
}

export function fromBool(value: boolean): number {
  return value ? 1 : 0;
}
