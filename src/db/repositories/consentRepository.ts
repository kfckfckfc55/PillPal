import type { SQLiteDatabase } from 'expo-sqlite';

import type { Consent, ConsentType } from '@/types/models';
import { nowIso } from '@/utils/date';
import { newId } from '@/utils/id';

const CONSENT_COLUMNS = `
  id, consent_type AS consentType, document_version AS documentVersion, profile_id AS profileId,
  granted_at AS grantedAt, withdrawn_at AS withdrawnAt, created_at AS createdAt`;

export interface RecordConsentInput {
  consentType: ConsentType;
  documentVersion: string;
  profileId?: string | null;
}

/** Ghi nhận người dùng chủ động đồng ý (không bao giờ gọi hàm này khi người dùng chưa bấm đồng ý). */
export async function recordConsent(db: SQLiteDatabase, input: RecordConsentInput): Promise<Consent> {
  const stamp = nowIso();
  const consent: Consent = {
    id: newId(),
    consentType: input.consentType,
    documentVersion: input.documentVersion,
    profileId: input.profileId ?? null,
    grantedAt: stamp,
    withdrawnAt: null,
    createdAt: stamp,
  };
  await db.runAsync(
    `INSERT INTO consents (id, consent_type, document_version, profile_id, granted_at, withdrawn_at, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?)`,
    [consent.id, consent.consentType, consent.documentVersion, consent.profileId, stamp, stamp],
  );
  return consent;
}

/** Đồng ý còn hiệu lực gần nhất (chưa rút lại). */
export async function getActiveConsent(
  db: SQLiteDatabase,
  consentType: ConsentType,
  profileId: string | null = null,
): Promise<Consent | null> {
  return db.getFirstAsync<Consent>(
    `SELECT ${CONSENT_COLUMNS} FROM consents
     WHERE consent_type = ? AND withdrawn_at IS NULL AND profile_id IS ?
     ORDER BY granted_at DESC LIMIT 1`,
    [consentType, profileId],
  );
}

/** Rút lại mọi đồng ý còn hiệu lực của loại này. */
export async function withdrawConsent(
  db: SQLiteDatabase,
  consentType: ConsentType,
  profileId: string | null = null,
): Promise<void> {
  await db.runAsync(
    `UPDATE consents SET withdrawn_at = ?
     WHERE consent_type = ? AND withdrawn_at IS NULL AND profile_id IS ?`,
    [nowIso(), consentType, profileId],
  );
}
