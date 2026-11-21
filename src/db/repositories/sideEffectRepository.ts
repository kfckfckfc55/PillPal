import type { SQLiteDatabase } from 'expo-sqlite';

import type { SideEffectLog, SideEffectTag } from '@/types/models';
import { nowIso } from '@/utils/date';
import { newId } from '@/utils/id';

/** Phản ứng sau uống (bảng `side_effect_logs`, chỉ lưu trên máy). */

const COLUMNS = `
  id, profile_id AS profileId, dose_event_id AS doseEventId, medication_id AS medicationId,
  tag, note, logged_at AS loggedAt, created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt`;

/** Phản ứng đã ghi cho các cữ. */
export async function listSideEffectsForDoses(
  db: SQLiteDatabase,
  doseEventIds: readonly string[],
): Promise<SideEffectLog[]> {
  if (doseEventIds.length === 0) return [];
  const placeholders = doseEventIds.map(() => '?').join(', ');
  return db.getAllAsync<SideEffectLog>(
    `SELECT ${COLUMNS} FROM side_effect_logs
     WHERE deleted_at IS NULL AND dose_event_id IN (${placeholders})
     ORDER BY logged_at ASC`,
    [...doseEventIds],
  );
}

export interface DoseRef {
  id: string;
  profileId: string;
  medicationId: string;
}

/**
 * Thay toàn bộ phản ứng đã ghi cho một cữ bằng danh sách mới.
 * Ghi chú chỉ gắn với phản ứng "Khác".
 */
export async function replaceDoseSideEffects(
  db: SQLiteDatabase,
  dose: DoseRef,
  tags: readonly SideEffectTag[],
  otherNote: string | null,
): Promise<void> {
  const stamp = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM side_effect_logs WHERE dose_event_id = ?', [dose.id]);
    for (const tag of tags) {
      await db.runAsync(
        `INSERT INTO side_effect_logs (id, profile_id, dose_event_id, medication_id, tag, note, logged_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId(), dose.profileId, dose.id, dose.medicationId, tag, tag === 'other' ? otherNote : null, stamp, stamp, stamp],
      );
    }
  });
}
