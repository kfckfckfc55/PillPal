import type { SQLiteDatabase } from 'expo-sqlite';

import { toBool } from '@/db/client';
import type { DoseEvent, MealRelation, MedicationForm } from '@/types/models';

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
  d.scheduled_at AS scheduledAt, d.status, d.taken_at AS takenAt, d.snooze_until AS snoozeUntil,
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
