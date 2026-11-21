import type { SQLiteDatabase } from 'expo-sqlite';

import { toBool } from '@/db/client';
import { deductStock } from '@/features/medications/doseActions';
import type { DoseSyncPlan, ExistingDoseEvent } from '@/features/medications/doseSync';
import type { DoseEvent, DoseStatus, MealRelation, MedicationForm } from '@/types/models';
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
  d.skip_reason AS skipReason, d.note, d.stock_deducted AS stockDeducted,
  d.remote_id AS remoteId, d.synced_at AS syncedAt,
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
        'UPDATE dose_events SET scheduled_at = ?, slot_key = ?, status = ?, updated_at = ? WHERE id = ?',
        [update.scheduledAt, update.slotKey, update.status, stamp, update.id],
      );
    }
    for (const occurrence of plan.inserts) {
      const scheduledAt = occurrence.scheduledAt.toISOString();
      await clearTombstones(db, occurrence.medicationId, occurrence.scheduleId, scheduledAt);
      await db.runAsync(
        `INSERT INTO dose_events (
           id, profile_id, medication_id, schedule_id, scheduled_at, slot_key, status, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId(),
          occurrence.profileId,
          occurrence.medicationId,
          occurrence.scheduleId,
          scheduledAt,
          occurrence.slotKey,
          occurrence.paused ? 'paused' : 'pending',
          stamp,
          stamp,
        ],
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Milestone 2B: thao tác trên cữ (đã uống, nhắc lại, bỏ qua, hoàn tác) + trừ số viên
// ---------------------------------------------------------------------------

interface DoseActionRow {
  id: string;
  status: DoseStatus;
  medicationId: string;
  doseAmount: number;
  quantityOnHand: number | null;
  stockDeducted: number | null;
}

async function getDoseForAction(db: SQLiteDatabase, id: string): Promise<DoseActionRow> {
  const row = await db.getFirstAsync<DoseActionRow>(
    `SELECT d.id, d.status, d.medication_id AS medicationId,
            COALESCE(s.dose_amount, m.dose_amount) AS doseAmount,
            m.quantity_on_hand AS quantityOnHand, d.stock_deducted AS stockDeducted
     FROM dose_events d
     JOIN medications m ON m.id = d.medication_id
     LEFT JOIN medication_schedules s ON s.id = d.schedule_id
     WHERE d.id = ? AND d.deleted_at IS NULL`,
    [id],
  );
  if (!row) throw new Error(`Không tìm thấy cữ thuốc ${id}`);
  return row;
}

/**
 * Ghi "Đã uống" (đúng giờ hoặc trễ) và trừ tồn kho một liều (không để âm).
 * Cữ đã ghi uống từ trước thì chỉ sửa giờ uống — không trừ thêm lần nữa.
 */
export async function recordDoseTaken(
  db: SQLiteDatabase,
  id: string,
  takenAt: string,
  status: 'taken' | 'taken_late',
  stamp: string,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const dose = await getDoseForAction(db, id);
    const alreadyTaken = dose.status === 'taken' || dose.status === 'taken_late';
    let deducted = dose.stockDeducted;
    if (!alreadyTaken && dose.quantityOnHand !== null) {
      const change = deductStock(dose.quantityOnHand, dose.doseAmount);
      deducted = change.deducted;
      await db.runAsync('UPDATE medications SET quantity_on_hand = ?, updated_at = ? WHERE id = ?', [
        change.quantity,
        stamp,
        dose.medicationId,
      ]);
    }
    await db.runAsync(
      `UPDATE dose_events SET status = ?, taken_at = ?, snooze_until = NULL, skip_reason = NULL,
         stock_deducted = ?, updated_at = ?
       WHERE id = ?`,
      [status, takenAt, deducted, stamp, id],
    );
  });
}

/** Nhắc lại sau: chỉ áp dụng cho cữ đang chờ. */
export async function snoozeDose(db: SQLiteDatabase, id: string, until: string, stamp: string): Promise<void> {
  await db.runAsync(
    `UPDATE dose_events SET status = 'snoozed', snooze_until = ?, updated_at = ?
     WHERE id = ? AND status IN ('pending','snoozed') AND deleted_at IS NULL`,
    [until, stamp, id],
  );
}

/** Bỏ qua cữ (kèm lý do tùy chọn): chỉ áp dụng cho cữ đang chờ. */
export async function skipDose(db: SQLiteDatabase, id: string, reason: string | null, stamp: string): Promise<void> {
  await db.runAsync(
    `UPDATE dose_events SET status = 'skipped', skip_reason = ?, snooze_until = NULL, updated_at = ?
     WHERE id = ? AND status IN ('pending','snoozed') AND deleted_at IS NULL`,
    [reason, stamp, id],
  );
}

/**
 * Hoàn tác: đưa cữ về "chưa xác nhận", cộng trả đúng số thuốc đã trừ và xóa phản ứng đã ghi cho cữ đó.
 * (Nếu cữ đang nằm trong thời gian tạm dừng, lần đồng bộ cữ tiếp theo sẽ tự chuyển sang "tạm dừng".)
 */
export async function undoDoseAction(db: SQLiteDatabase, id: string, stamp: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    const dose = await getDoseForAction(db, id);
    if (dose.stockDeducted !== null && dose.stockDeducted > 0 && dose.quantityOnHand !== null) {
      await db.runAsync(
        'UPDATE medications SET quantity_on_hand = quantity_on_hand + ?, updated_at = ? WHERE id = ?',
        [dose.stockDeducted, stamp, dose.medicationId],
      );
    }
    await db.runAsync(
      `UPDATE dose_events SET status = 'pending', taken_at = NULL, snooze_until = NULL, skip_reason = NULL,
         stock_deducted = NULL, updated_at = ?
       WHERE id = ?`,
      [stamp, id],
    );
    await db.runAsync('DELETE FROM side_effect_logs WHERE dose_event_id = ?', [id]);
  });
}

/**
 * Cữ của những ngày trước hôm nay mà vẫn chưa xác nhận / đang nhắc lại → "Đã quên".
 * (Cữ tạm dừng giữ nguyên — không tính là quên.) @returns số cữ đã đổi.
 */
export async function markPastDosesMissed(db: SQLiteDatabase, beforeIso: string, stamp: string): Promise<number> {
  const result = await db.runAsync(
    `UPDATE dose_events SET status = 'missed', snooze_until = NULL, updated_at = ?
     WHERE deleted_at IS NULL AND status IN ('pending','snoozed') AND scheduled_at < ?
       AND profile_id IN (SELECT id FROM profiles WHERE is_remote = 0)`,
    [stamp, beforeIso],
  );
  return result.changes;
}

// ---------------------------------------------------------------------------
// Milestone 2C: cữ sắp tới cần thông báo
// ---------------------------------------------------------------------------

export interface UpcomingReminderDose {
  id: string;
  profileId: string;
  profileName: string;
  status: 'pending' | 'snoozed';
  scheduledAt: string;
  snoozeUntil: string | null;
  medicationName: string;
  strength: string | null;
  doseAmount: number;
  doseUnit: string;
  mealRelation: MealRelation;
}

/**
 * Cữ chưa xác nhận / đang nhắc lại có giờ nhắc sau `fromIso`, của thuốc đang dùng ở hồ sơ trên máy
 * (cữ tạm dừng, đã uống, bỏ qua… không được nhắc).
 */
export async function listUpcomingReminderDoses(
  db: SQLiteDatabase,
  fromIso: string,
): Promise<UpcomingReminderDose[]> {
  return db.getAllAsync<UpcomingReminderDose>(
    `SELECT d.id, d.profile_id AS profileId, p.display_name AS profileName, d.status,
            d.scheduled_at AS scheduledAt, d.snooze_until AS snoozeUntil,
            m.name AS medicationName, m.strength, COALESCE(s.dose_amount, m.dose_amount) AS doseAmount,
            m.dose_unit AS doseUnit, m.meal_relation AS mealRelation
     FROM dose_events d
     JOIN medications m ON m.id = d.medication_id
     JOIN profiles p ON p.id = d.profile_id
     LEFT JOIN medication_schedules s ON s.id = d.schedule_id
     WHERE d.deleted_at IS NULL AND m.deleted_at IS NULL AND m.is_active = 1
       AND p.deleted_at IS NULL AND p.is_remote = 0
       AND ((d.status = 'pending' AND d.scheduled_at > ?) OR (d.status = 'snoozed' AND d.snooze_until > ?))
     ORDER BY COALESCE(d.snooze_until, d.scheduled_at) ASC`,
    [fromIso, fromIso],
  );
}

/** Một cữ (kèm tên thuốc) theo id — dùng khi xử lý nút bấm trên thông báo. */
export async function getDoseEventWithMedication(
  db: SQLiteDatabase,
  id: string,
): Promise<DoseEventWithMedication | null> {
  const row = await db.getFirstAsync<DoseEventRow>(
    `SELECT ${DOSE_EVENT_COLUMNS}
     FROM dose_events d
     JOIN medications m ON m.id = d.medication_id
     LEFT JOIN medication_schedules s ON s.id = d.schedule_id
     WHERE d.id = ? AND d.deleted_at IS NULL`,
    [id],
  );
  return row ? mapDoseEvent(row) : null;
}
