import type { SQLiteDatabase } from 'expo-sqlite';

import { toBool } from '@/db/client';
import type { DoseSyncPlan, ExistingDoseEvent } from '@/features/medications/doseSync';
import type { DoseEvent, MealRelation, MedicationForm } from '@/types/models';
import { newId } from '@/utils/id';

/** Cữ thuốc kèm thông tin thuốc để hiển thị. */
export interface DoseEventWithMedication extends DoseEvent {
  medicationName: string;
  strength: string | null;
  form: MedicationForm;
  doseAmount: number;
  doseUnit: string;
  mealRelation: MealRelation;
  causesDrowsiness: boolean;
  causesDizziness: boolean;
}

type DoseEventRow = Omit<DoseEventWithMedication, 'causesDrowsiness' | 'causesDizziness'> & {
  causesDrowsiness: number;
  causesDizziness: number;
};

const DOSE_EVENT_COLUMNS = `
  d.id, d.profile_id AS profileId, d.medication_id AS medicationId, d.schedule_id AS scheduleId,
  d.scheduled_at AS scheduledAt, d.slot_key AS slotKey, d.status, d.taken_at AS takenAt, d.snooze_until AS snoozeUntil,
  d.skip_reason AS skipReason, d.note, d.remote_id AS remoteId, d.synced_at AS syncedAt,
  d.created_at AS createdAt, d.updated_at AS updatedAt, d.deleted_at AS deletedAt,
  m.name AS medicationName, m.strength, m.form,
  COALESCE(s.dose_amount, m.dose_amount) AS doseAmount, m.dose_unit AS doseUnit,
  m.meal_relation AS mealRelation, m.causes_drowsiness AS causesDrowsiness,
  m.causes_dizziness AS causesDizziness`;

function mapDoseEvent(row: DoseEventRow): DoseEventWithMedication {
  return {
    ...row,
    causesDrowsiness: toBool(row.causesDrowsiness),
    causesDizziness: toBool(row.causesDizziness),
  };
}

/** Các cữ thuốc của một hồ sơ trong khoảng [fromIso, toIso), sắp theo giờ. */
export async function listDoseEventsBetween(
  db: SQLiteDatabase,
  profileId: string,
  fromIso: string,
  toIso: string,
): Promise<DoseEventWithMedication[]> {
  const rows = await db.getAllAsync<DoseEventRow>(
    `SELECT ${DOSE_EVENT_COLUMNS}
     FROM dose_events d
     JOIN medications m ON m.id = d.medication_id
     LEFT JOIN medication_schedules s ON s.id = d.schedule_id
     WHERE d.profile_id = ? AND d.scheduled_at >= ? AND d.scheduled_at < ? AND d.deleted_at IS NULL
     ORDER BY d.scheduled_at ASC, m.name COLLATE NOCASE ASC`,
    [profileId, fromIso, toIso],
  );
  return rows.map(mapDoseEvent);
}

// ---------------------------------------------------------------------------
// Milestone 2A: đồng bộ cữ thuốc với lịch uống
// ---------------------------------------------------------------------------

/** Cữ chưa xóa của các hồ sơ trên máy, từ `fromIso` trở đi (đầu vào cho `planDoseSync`). */
export async function listDoseEventsForSync(
  db: SQLiteDatabase,
  fromIso: string,
): Promise<ExistingDoseEvent[]> {
  return db.getAllAsync<ExistingDoseEvent>(
    `SELECT d.id, d.medication_id AS medicationId, d.schedule_id AS scheduleId, d.slot_key AS slotKey,
            d.scheduled_at AS scheduledAt, d.status
     FROM dose_events d
     JOIN profiles p ON p.id = d.profile_id
     WHERE d.deleted_at IS NULL AND p.is_remote = 0 AND d.scheduled_at >= ?`,
    [fromIso],
  );
}

/**
 * Xóa bản ghi đã xóa mềm đang "chiếm chỗ" (cùng thuốc + lịch + giờ) để không vi phạm ràng buộc UNIQUE
 * khi tạo / dời cữ vào đúng giờ đó.
 */
async function clearTombstones(
  db: SQLiteDatabase,
  medicationId: string,
  scheduleId: string,
  scheduledAt: string,
): Promise<void> {
  await db.runAsync(
    `DELETE FROM dose_events
     WHERE medication_id = ? AND schedule_id = ? AND scheduled_at = ? AND deleted_at IS NOT NULL`,
    [medicationId, scheduleId, scheduledAt],
  );
}

/**
 * Ghi kế hoạch đồng bộ vào DB trong một transaction.
 * Cữ bị loại: xóa hẳn nếu chưa từng gửi lên máy chủ; đã gửi (có remote_id) thì xóa mềm để đồng bộ việc xóa.
 */
export async function applyDoseSyncPlan(db: SQLiteDatabase, plan: DoseSyncPlan, stamp: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const id of plan.removals) {
      await db.runAsync('DELETE FROM dose_events WHERE id = ? AND remote_id IS NULL', [id]);
      await db.runAsync(
        'UPDATE dose_events SET deleted_at = ?, updated_at = ? WHERE id = ? AND remote_id IS NOT NULL',
        [stamp, stamp, id],
      );
    }
    for (const update of plan.updates) {
      await clearTombstones(db, update.medicationId, update.scheduleId, update.scheduledAt);
      await db.runAsync(
        'UPDATE dose_events SET scheduled_at = ?, slot_key = ?, updated_at = ? WHERE id = ?',
        [update.scheduledAt, update.slotKey, stamp, update.id],
      );
    }
    for (const occurrence of plan.inserts) {
      const scheduledAt = occurrence.scheduledAt.toISOString();
      await clearTombstones(db, occurrence.medicationId, occurrence.scheduleId, scheduledAt);
      await db.runAsync(
        `INSERT INTO dose_events (
           id, profile_id, medication_id, schedule_id, scheduled_at, slot_key, status, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [
          newId(),
          occurrence.profileId,
          occurrence.medicationId,
          occurrence.scheduleId,
          scheduledAt,
          occurrence.slotKey,
          stamp,
          stamp,
        ],
      );
    }
  });
}
