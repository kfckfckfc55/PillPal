import type { SQLiteDatabase } from 'expo-sqlite';

import { fromBool, toBool, type BindValue } from '@/db/client';
import type {
  DayType,
  MealRelation,
  Medication,
  MedicationForm,
  MedicationSchedule,
  RoutineAnchorKind,
  ScheduleType,
} from '@/types/models';
import { nowIso } from '@/utils/date';
import { newId } from '@/utils/id';

/** Cột của bảng medications (đổi sang camelCase). `alias` = tên bí danh bảng khi JOIN. */
function medicationColumns(alias = ''): string {
  const t = alias ? `${alias}.` : '';
  return `
  ${t}id, ${t}profile_id AS profileId, ${t}journey_id AS journeyId, ${t}name,
  ${t}active_ingredient AS activeIngredient, ${t}strength, ${t}form, ${t}dose_amount AS doseAmount,
  ${t}dose_unit AS doseUnit, ${t}instructions, ${t}meal_relation AS mealRelation,
  ${t}causes_drowsiness AS causesDrowsiness, ${t}causes_dizziness AS causesDizziness,
  ${t}start_date AS startDate, ${t}duration_days AS durationDays, ${t}quantity_on_hand AS quantityOnHand,
  ${t}low_stock_threshold_days AS lowStockThresholdDays, ${t}is_active AS isActive,
  ${t}remote_id AS remoteId, ${t}synced_at AS syncedAt,
  ${t}created_at AS createdAt, ${t}updated_at AS updatedAt, ${t}deleted_at AS deletedAt`;
}

const MEDICATION_COLUMNS = medicationColumns();

type MedicationRow = Omit<Medication, 'causesDrowsiness' | 'causesDizziness' | 'isActive'> & {
  causesDrowsiness: number;
  causesDizziness: number;
  isActive: number;
};

function mapMedication(row: MedicationRow): Medication {
  return {
    ...row,
    causesDrowsiness: toBool(row.causesDrowsiness),
    causesDizziness: toBool(row.causesDizziness),
    isActive: toBool(row.isActive),
  };
}

const SCHEDULE_COLUMNS = `
  s.id, s.medication_id AS medicationId, s.schedule_type AS scheduleType, s.time_of_day AS timeOfDay,
  s.anchor, s.offset_minutes AS offsetMinutes, s.interval_hours AS intervalHours,
  s.days_of_week AS daysOfWeek, s.day_type AS dayType, s.dose_amount AS doseAmount,
  s.remote_id AS remoteId, s.synced_at AS syncedAt,
  s.created_at AS createdAt, s.updated_at AS updatedAt, s.deleted_at AS deletedAt`;

/** Thuốc đang dùng của một hồ sơ, sắp theo tên. */
export async function listActiveMedications(
  db: SQLiteDatabase,
  profileId: string,
): Promise<Medication[]> {
  const rows = await db.getAllAsync<MedicationRow>(
    `SELECT ${MEDICATION_COLUMNS} FROM medications
     WHERE profile_id = ? AND is_active = 1 AND deleted_at IS NULL
     ORDER BY name COLLATE NOCASE ASC`,
    [profileId],
  );
  return rows.map(mapMedication);
}

/** Lịch uống của tất cả thuốc đang dùng thuộc một hồ sơ. */
export async function listSchedulesForProfile(
  db: SQLiteDatabase,
  profileId: string,
): Promise<MedicationSchedule[]> {
  return db.getAllAsync<MedicationSchedule>(
    `SELECT ${SCHEDULE_COLUMNS}
     FROM medication_schedules s
     JOIN medications m ON m.id = s.medication_id
     WHERE m.profile_id = ? AND m.is_active = 1 AND m.deleted_at IS NULL AND s.deleted_at IS NULL
     ORDER BY s.medication_id, s.time_of_day, s.anchor`,
    [profileId],
  );
}

// ---------------------------------------------------------------------------
// Milestone 2A: thêm / sửa / ngừng / xóa thuốc và lịch uống
// ---------------------------------------------------------------------------

/** Thông tin thuốc người dùng nhập (không gồm id, hồ sơ, cột hệ thống). */
export interface MedicationInput {
  name: string;
  activeIngredient: string | null;
  strength: string | null;
  form: MedicationForm;
  doseAmount: number;
  doseUnit: string;
  instructions: string | null;
  mealRelation: MealRelation;
  causesDrowsiness: boolean;
  causesDizziness: boolean;
  /** "YYYY-MM-DD" */
  startDate: string;
  /** null = dùng dài hạn. */
  durationDays: number | null;
  /** null = không theo dõi số lượng. */
  quantityOnHand: number | null;
  lowStockThresholdDays: number;
}

/** Một lịch uống cần lưu. `id = null` → tạo mới; id có sẵn → sửa tại chỗ (giữ lịch sử cữ của ô đó). */
export interface ScheduleInput {
  id: string | null;
  scheduleType: ScheduleType;
  timeOfDay: string | null;
  anchor: RoutineAnchorKind | null;
  offsetMinutes: number;
  intervalHours: number | null;
  daysOfWeek: string | null;
  dayType: DayType | null;
  doseAmount: number | null;
}

/** Một thuốc (kể cả đã ngừng), null nếu không có hoặc đã xóa. */
export async function getMedication(db: SQLiteDatabase, id: string): Promise<Medication | null> {
  const row = await db.getFirstAsync<MedicationRow>(
    `SELECT ${MEDICATION_COLUMNS} FROM medications WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row ? mapMedication(row) : null;
}

/** Mọi thuốc chưa xóa của một hồ sơ: đang dùng trước, đã ngừng sau, sắp theo tên. */
export async function listMedications(db: SQLiteDatabase, profileId: string): Promise<Medication[]> {
  const rows = await db.getAllAsync<MedicationRow>(
    `SELECT ${MEDICATION_COLUMNS} FROM medications
     WHERE profile_id = ? AND deleted_at IS NULL
     ORDER BY is_active DESC, name COLLATE NOCASE ASC`,
    [profileId],
  );
  return rows.map(mapMedication);
}

/** Lịch uống (chưa xóa) của một thuốc. */
export async function listSchedulesForMedication(
  db: SQLiteDatabase,
  medicationId: string,
): Promise<MedicationSchedule[]> {
  return db.getAllAsync<MedicationSchedule>(
    `SELECT ${SCHEDULE_COLUMNS} FROM medication_schedules s
     WHERE s.medication_id = ? AND s.deleted_at IS NULL
     ORDER BY s.created_at ASC, s.time_of_day, s.anchor`,
    [medicationId],
  );
}

/** Thuốc đang dùng của mọi hồ sơ trên máy (không gồm hồ sơ người thân nhận từ máy chủ). */
export async function listMedicationsForDoseSync(db: SQLiteDatabase): Promise<Medication[]> {
  const rows = await db.getAllAsync<MedicationRow>(
    `SELECT ${medicationColumns('m')}
     FROM medications m
     JOIN profiles p ON p.id = m.profile_id
     WHERE m.is_active = 1 AND m.deleted_at IS NULL AND p.deleted_at IS NULL AND p.is_remote = 0`,
    [],
  );
  return rows.map(mapMedication);
}

/** Lịch uống chưa xóa của các thuốc đang dùng (hồ sơ trên máy). */
export async function listSchedulesForDoseSync(db: SQLiteDatabase): Promise<MedicationSchedule[]> {
  return db.getAllAsync<MedicationSchedule>(
    `SELECT ${SCHEDULE_COLUMNS}
     FROM medication_schedules s
     JOIN medications m ON m.id = s.medication_id
     JOIN profiles p ON p.id = m.profile_id
     WHERE s.deleted_at IS NULL AND m.is_active = 1 AND m.deleted_at IS NULL
       AND p.deleted_at IS NULL AND p.is_remote = 0`,
    [],
  );
}

function medicationValues(input: MedicationInput): BindValue[] {
  return [
    input.name.trim(),
    input.activeIngredient,
    input.strength,
    input.form,
    input.doseAmount,
    input.doseUnit.trim(),
    input.instructions,
    input.mealRelation,
    fromBool(input.causesDrowsiness),
    fromBool(input.causesDizziness),
    input.startDate,
    input.durationDays,
    input.quantityOnHand,
    input.lowStockThresholdDays,
  ];
}

/** Ghi lịch uống: sửa lịch có id, tạo lịch mới, xóa mềm lịch không còn trong danh sách. */
async function saveSchedules(
  db: SQLiteDatabase,
  medicationId: string,
  schedules: readonly ScheduleInput[],
  stamp: string,
): Promise<void> {
  const existing = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM medication_schedules WHERE medication_id = ? AND deleted_at IS NULL',
    [medicationId],
  );
  const existingIds = new Set(existing.map((row) => row.id));
  const keptIds = new Set<string>();

  for (const schedule of schedules) {
    const values: BindValue[] = [
      schedule.scheduleType,
      schedule.timeOfDay,
      schedule.anchor,
      schedule.offsetMinutes,
      schedule.intervalHours,
      schedule.daysOfWeek,
      schedule.dayType,
      schedule.doseAmount,
    ];
    if (schedule.id !== null && existingIds.has(schedule.id)) {
      keptIds.add(schedule.id);
      await db.runAsync(
        `UPDATE medication_schedules SET
           schedule_type = ?, time_of_day = ?, anchor = ?, offset_minutes = ?, interval_hours = ?,
           days_of_week = ?, day_type = ?, dose_amount = ?, updated_at = ?
         WHERE id = ?`,
        [...values, stamp, schedule.id],
      );
    } else {
      await db.runAsync(
        `INSERT INTO medication_schedules (
           id, medication_id, schedule_type, time_of_day, anchor, offset_minutes, interval_hours,
           days_of_week, day_type, dose_amount, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId(), medicationId, ...values, stamp, stamp],
      );
    }
  }

  for (const id of existingIds) {
    if (!keptIds.has(id)) {
      await db.runAsync(
        'UPDATE medication_schedules SET deleted_at = ?, updated_at = ? WHERE id = ?',
        [stamp, stamp, id],
      );
    }
  }
}

/** Thêm thuốc mới kèm lịch uống (một transaction). @returns id thuốc. */
export async function createMedication(
  db: SQLiteDatabase,
  profileId: string,
  input: MedicationInput,
  schedules: readonly ScheduleInput[],
): Promise<string> {
  const id = newId();
  const stamp = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO medications (
         name, active_ingredient, strength, form, dose_amount, dose_unit, instructions, meal_relation,
         causes_drowsiness, causes_dizziness, start_date, duration_days, quantity_on_hand,
         low_stock_threshold_days, id, profile_id, is_active, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [...medicationValues(input), id, profileId, stamp, stamp],
    );
    await saveSchedules(db, id, schedules, stamp);
  });
  return id;
}

/** Sửa thuốc và lịch uống (một transaction). */
export async function updateMedication(
  db: SQLiteDatabase,
  id: string,
  input: MedicationInput,
  schedules: readonly ScheduleInput[],
): Promise<void> {
  const stamp = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE medications SET
         name = ?, active_ingredient = ?, strength = ?, form = ?, dose_amount = ?, dose_unit = ?,
         instructions = ?, meal_relation = ?, causes_drowsiness = ?, causes_dizziness = ?,
         start_date = ?, duration_days = ?, quantity_on_hand = ?, low_stock_threshold_days = ?,
         updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [...medicationValues(input), stamp, id],
    );
    await saveSchedules(db, id, schedules, stamp);
  });
}

/** Ngừng dùng / dùng lại một thuốc (giữ nguyên lịch sử). */
export async function setMedicationActive(
  db: SQLiteDatabase,
  id: string,
  active: boolean,
): Promise<void> {
  await db.runAsync('UPDATE medications SET is_active = ?, updated_at = ? WHERE id = ?', [
    fromBool(active),
    nowIso(),
    id,
  ]);
}

/** Xóa mềm thuốc và lịch uống (các cữ đã ghi giữ làm lịch sử; cữ chưa uống được dọn khi đồng bộ cữ). */
export async function deleteMedication(db: SQLiteDatabase, id: string): Promise<void> {
  const stamp = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE medications SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      stamp,
      stamp,
      id,
    ]);
    await db.runAsync(
      'UPDATE medication_schedules SET deleted_at = ?, updated_at = ? WHERE medication_id = ? AND deleted_at IS NULL',
      [stamp, stamp, id],
    );
  });
}

/** Lịch uống chưa xóa của mọi thuốc chưa xóa thuộc một hồ sơ (kể cả thuốc đã ngừng). */
export async function listAllSchedulesForProfile(
  db: SQLiteDatabase,
  profileId: string,
): Promise<MedicationSchedule[]> {
  return db.getAllAsync<MedicationSchedule>(
    `SELECT ${SCHEDULE_COLUMNS}
     FROM medication_schedules s
     JOIN medications m ON m.id = s.medication_id
     WHERE m.profile_id = ? AND m.deleted_at IS NULL AND s.deleted_at IS NULL
     ORDER BY s.medication_id, s.created_at`,
    [profileId],
  );
}
