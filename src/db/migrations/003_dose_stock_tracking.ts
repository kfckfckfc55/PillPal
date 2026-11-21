import type { SQLiteDatabase } from 'expo-sqlite';

import type { Migration } from './types';

/*
 * Migration v3 — Milestone 2B.
 * 1. dose_events.stock_deducted: số lượng thuốc đã trừ khỏi tồn kho khi bấm "Đã uống".
 *    Hoàn tác thì cộng trả đúng số này (kể cả khi tồn kho từng bị chặn ở 0 hoặc liều đã đổi sau đó).
 * 2. Chỉ mục tra phản ứng sau uống theo cữ và tạm dừng theo thuốc.
 */
const SQL = `
ALTER TABLE dose_events ADD COLUMN stock_deducted REAL CHECK (stock_deducted IS NULL OR stock_deducted >= 0);
CREATE INDEX idx_side_effect_logs_dose ON side_effect_logs(dose_event_id);
CREATE INDEX idx_medication_pauses_active ON medication_pauses(medication_id, end_at) WHERE deleted_at IS NULL;
`;

export const migration003DoseStockTracking: Migration = {
  version: 3,
  name: 'dose_stock_tracking',
  async up(db: SQLiteDatabase) {
    await db.execAsync(SQL);
  },
};

/** Xuất riêng chuỗi SQL để kiểm thử schema ngoài app (script kiểm tra). */
export const MIGRATION_003_SQL = SQL;
