import type { SQLiteDatabase } from 'expo-sqlite';

import { nowIso } from '@/utils/date';
import { newId } from '@/utils/id';

/** Bản ghi các thông báo Kề Bên đang hẹn trên máy (bảng `scheduled_notifications`) — để tra cứu / dọn khi xóa dữ liệu. */

export interface ScheduledNotificationRecord {
  entityType: 'dose_event' | 'other';
  entityId: string;
  notificationId: string;
  /** ISO UTC */
  fireAt: string;
}

/** Thay toàn bộ bản ghi thông báo nhắc thuốc bằng danh sách mới (sau mỗi lần lên lịch lại). */
export async function replaceReminderRecords(
  db: SQLiteDatabase,
  records: readonly ScheduledNotificationRecord[],
): Promise<void> {
  const stamp = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM scheduled_notifications WHERE entity_type IN ('dose_event', 'other')", []);
    for (const record of records) {
      await db.runAsync(
        `INSERT INTO scheduled_notifications (id, entity_type, entity_id, notification_id, fire_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newId(), record.entityType, record.entityId, record.notificationId, record.fireAt, stamp],
      );
    }
  });
}

export async function countReminderRecords(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT COUNT(*) AS total FROM scheduled_notifications WHERE entity_type IN ('dose_event', 'other')",
    [],
  );
  return row?.total ?? 0;
}
