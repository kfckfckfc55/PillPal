import type { SQLiteDatabase } from 'expo-sqlite';

import { getSchemaVersion } from '@/db/migrations';
import { TABLE_NAMES, type TableName } from '@/db/schema';

export interface DatabaseStats {
  schemaVersion: number;
  counts: { table: TableName; count: number }[];
  totalRecords: number;
}

/** Thống kê số bản ghi từng bảng — chỉ dùng cho màn hình "Dữ liệu (dev)". */
export async function getDatabaseStats(db: SQLiteDatabase): Promise<DatabaseStats> {
  const schemaVersion = await getSchemaVersion(db);
  const counts: DatabaseStats['counts'] = [];
  // Tên bảng lấy từ hằng số cố định trong code (không phải dữ liệu người dùng) nên ghép chuỗi an toàn.
  for (const table of TABLE_NAMES) {
    const row = await db.getFirstAsync<{ total: number }>(`SELECT COUNT(*) AS total FROM ${table}`, []);
    counts.push({ table, count: row?.total ?? 0 });
  }
  const totalRecords = counts.reduce((sum, item) => sum + item.count, 0);
  return { schemaVersion, counts, totalRecords };
}
