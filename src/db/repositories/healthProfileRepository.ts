import type { SQLiteDatabase } from 'expo-sqlite';

import type { Allergy, Condition, EmergencyContact } from '@/types/models';

/** Thông tin sức khỏe nền của hồ sơ: dị ứng, bệnh nền, người liên hệ khẩn cấp. */

export async function listAllergies(db: SQLiteDatabase, profileId: string): Promise<Allergy[]> {
  return db.getAllAsync<Allergy>(
    `SELECT id, profile_id AS profileId, substance, severity, reaction, note,
            created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt
     FROM allergies
     WHERE profile_id = ? AND deleted_at IS NULL
     ORDER BY CASE severity WHEN 'severe' THEN 0 WHEN 'moderate' THEN 1 ELSE 2 END, substance`,
    [profileId],
  );
}

export async function listConditions(db: SQLiteDatabase, profileId: string): Promise<Condition[]> {
  return db.getAllAsync<Condition>(
    `SELECT id, profile_id AS profileId, name, since_date AS sinceDate, note,
            created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt
     FROM conditions
     WHERE profile_id = ? AND deleted_at IS NULL
     ORDER BY name`,
    [profileId],
  );
}

export async function listEmergencyContacts(
  db: SQLiteDatabase,
  profileId: string,
): Promise<EmergencyContact[]> {
  return db.getAllAsync<EmergencyContact>(
    `SELECT id, profile_id AS profileId, name, relation, phone, priority,
            created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt
     FROM emergency_contacts
     WHERE profile_id = ? AND deleted_at IS NULL
     ORDER BY priority ASC, name`,
    [profileId],
  );
}
