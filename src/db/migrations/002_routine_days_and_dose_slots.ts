import type { SQLiteDatabase } from 'expo-sqlite';

import type { Migration } from './types';

/*
 * Migration v2 — Milestone 2A.
 * 1. routine_day_patterns: mỗi thứ trong tuần là loại ngày gì (ngày làm / ngày nghỉ / làm ca) theo từng hồ sơ.
 *    Chưa có dòng nào → mặc định Thứ Hai–Thứ Sáu là ngày làm, Thứ Bảy & Chủ nhật là ngày nghỉ.
 * 2. routine_day_overrides: đổi loại ngày cho riêng một ngày (VD: hôm nay được nghỉ, đổi ca).
 *    Hai bảng cấu hình này chỉ lưu trên máy, không đồng bộ → ghi đè trực tiếp, không cần xóa mềm.
 * 3. dose_events.slot_key: định danh "ô" của cữ thuốc = "<ngày sinh hoạt YYYY-MM-DD>#<thứ tự trong ngày>".
 *    Nhờ đó khi đổi giờ uống / giờ sinh hoạt, cữ CHƯA xác nhận được dời giờ, còn cữ đã uống / bỏ qua
 *    giữ nguyên và không sinh thêm cữ thứ hai trong cùng ngày (tránh nhắc uống trùng liều).
 */
const SQL = `
CREATE TABLE routine_day_patterns (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  day_type TEXT NOT NULL CHECK (day_type IN ('workday','day_off','shift')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (profile_id, weekday)
);

CREATE TABLE routine_day_overrides (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  day_type TEXT NOT NULL CHECK (day_type IN ('workday','day_off','shift')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (profile_id, date)
);

ALTER TABLE dose_events ADD COLUMN slot_key TEXT;

-- Cữ đã có từ trước (dữ liệu mẫu bước 1B/1C): mỗi lịch uống 1 cữ/ngày → ô = ngày địa phương + "#0".
-- Chỉ điền cho 1 cữ mỗi (lịch, ngày) để chắc chắn không vi phạm chỉ mục duy nhất bên dưới.
UPDATE dose_events
SET slot_key = date(scheduled_at, 'localtime') || '#0'
WHERE id IN (
  SELECT MIN(id) FROM dose_events
  WHERE schedule_id IS NOT NULL AND deleted_at IS NULL
  GROUP BY schedule_id, date(scheduled_at, 'localtime')
);

CREATE UNIQUE INDEX idx_dose_events_slot
  ON dose_events(schedule_id, slot_key)
  WHERE slot_key IS NOT NULL AND deleted_at IS NULL;
`;

export const migration002RoutineDaysAndDoseSlots: Migration = {
  version: 2,
  name: 'routine_days_and_dose_slots',
  async up(db: SQLiteDatabase) {
    await db.execAsync(SQL);
  },
};

/** Xuất riêng chuỗi SQL để kiểm thử schema ngoài app (script kiểm tra). */
export const MIGRATION_002_SQL = SQL;
