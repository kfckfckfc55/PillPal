import type { SQLiteDatabase } from 'expo-sqlite';

import { fromBool, toBool } from '@/db/client';
import type { MedicationPause } from '@/types/models';
import { nowIso } from '@/utils/date';
import { newId } from '@/utils/id';

/** Tạm dừng thuốc có lý do (bảng `medication_pauses`). */

const PAUSE_COLUMNS = `
  p.id, p.medication_id AS medicationId, p.reason, p.start_at AS startAt, p.end_at AS endAt,
  p.auto_resume AS autoResume, p.remote_id AS remoteId, p.synced_at AS syncedAt,
  p.created_at AS createdAt, p.updated_at AS updatedAt, p.deleted_at AS deletedAt`;

type PauseRow = Omit<MedicationPause, 'autoResume'> & { autoResume: number };

function mapPause(row: PauseRow): MedicationPause {
  return { ...row, autoResume: toBool(row.autoResume) };
}

/** Các lần tạm dừng (chưa xóa) của một thuốc, mới nhất trước. */
export async function listPausesForMedication(
  db: SQLiteDatabase,
  medicationId: string,
): Promise<MedicationPause[]> {
  const rows = await db.getAllAsync<PauseRow>(
    `SELECT ${PAUSE_COLUMNS} FROM medication_pauses p
     WHERE p.medication_id = ? AND p.deleted_at IS NULL
     ORDER BY p.start_at DESC`,
    [medicationId],
  );
  return rows.map(mapPause);
}

/** Các lần tạm dừng chưa kết thúc (đang hoặc sắp diễn ra) của mọi thuốc thuộc một hồ sơ. */
export async function listOpenPausesForProfile(
  db: SQLiteDatabase,
  profileId: string,
  nowIsoValue: string,
): Promise<MedicationPause[]> {
  const rows = await db.getAllAsync<PauseRow>(
    `SELECT ${PAUSE_COLUMNS} FROM medication_pauses p
     JOIN medications m ON m.id = p.medication_id
     WHERE m.profile_id = ? AND m.deleted_at IS NULL AND p.deleted_at IS NULL
       AND (p.end_at IS NULL OR p.end_at > ?)
     ORDER BY p.start_at ASC`,
    [profileId, nowIsoValue],
  );
  return rows.map(mapPause);
}

/** Khoảng tạm dừng (chưa xóa) của thuốc đang dùng ở các hồ sơ trên máy — đầu vào đồng bộ cữ. */
export async function listPausesForDoseSync(db: SQLiteDatabase): Promise<MedicationPause[]> {
  const rows = await db.getAllAsync<PauseRow>(
    `SELECT ${PAUSE_COLUMNS} FROM medication_pauses p
     JOIN medications m ON m.id = p.medication_id
     JOIN profiles pr ON pr.id = m.profile_id
     WHERE p.deleted_at IS NULL AND m.deleted_at IS NULL AND m.is_active = 1
       AND pr.deleted_at IS NULL AND pr.is_remote = 0`,
    [],
  );
  return rows.map(mapPause);
}

export interface PauseInput {
  reason: string;
  /** ISO UTC */
  startAt: string;
  /** ISO UTC; null = đến khi người dùng bật lại. */
  endAt: string | null;
  autoResume: boolean;
}

/** Tạo một lần tạm dừng. @returns id. */
export async function createPause(
  db: SQLiteDatabase,
  medicationId: string,
  input: PauseInput,
): Promise<string> {
  const id = newId();
  const stamp = nowIso();
  await db.runAsync(
    `INSERT INTO medication_pauses (id, medication_id, reason, start_at, end_at, auto_resume, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, medicationId, input.reason.trim(), input.startAt, input.endAt, fromBool(input.autoResume), stamp, stamp],
  );
  return id;
}

/**
 * Kết thúc tạm dừng ngay bây giờ ("Dùng lại ngay").
 * Tạm dừng chưa bắt đầu thì xóa luôn (hủy lịch tạm dừng).
 */
export async function endPauseNow(db: SQLiteDatabase, pauseId: string, now: Date = new Date()): Promise<void> {
  const stamp = now.toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE medication_pauses SET deleted_at = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL AND start_at >= ?`,
      [stamp, stamp, pauseId, stamp],
    );
    await db.runAsync(
      `UPDATE medication_pauses SET end_at = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL AND start_at < ? AND (end_at IS NULL OR end_at > ?)`,
      [stamp, stamp, pauseId, stamp, stamp],
    );
  });
}
