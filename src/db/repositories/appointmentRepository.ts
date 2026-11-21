import type { SQLiteDatabase } from 'expo-sqlite';

import type { Appointment } from '@/types/models';

const APPOINTMENT_COLUMNS = `
  id, profile_id AS profileId, journey_id AS journeyId, appointment_type AS appointmentType,
  starts_at AS startsAt, facility, department, doctor_name AS doctorName, address, status, note,
  created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt`;

/** Lịch khám sắp tới gần nhất của một hồ sơ (tính từ `fromIso`). */
export async function getNextAppointment(
  db: SQLiteDatabase,
  profileId: string,
  fromIso: string,
): Promise<Appointment | null> {
  return db.getFirstAsync<Appointment>(
    `SELECT ${APPOINTMENT_COLUMNS} FROM appointments
     WHERE profile_id = ? AND status = 'upcoming' AND starts_at >= ? AND deleted_at IS NULL
     ORDER BY starts_at ASC LIMIT 1`,
    [profileId, fromIso],
  );
}
