import type { SQLiteDatabase } from 'expo-sqlite';

import { toBool } from '@/db/client';
import type { Medication, MedicationSchedule } from '@/types/models';

const MEDICATION_COLUMNS = `
  id, profile_id AS profileId, journey_id AS journeyId, name, active_ingredient AS activeIngredient,
  strength, form, dose_amount AS doseAmount, dose_unit AS doseUnit, instructions,
  meal_relation AS mealRelation, causes_drowsiness AS causesDrowsiness, causes_dizziness AS causesDizziness,
  start_date AS startDate, duration_days AS durationDays, quantity_on_hand AS quantityOnHand,
  low_stock_threshold_days AS lowStockThresholdDays, is_active AS isActive,
  remote_id AS remoteId, synced_at AS syncedAt,
  created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt`;

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
