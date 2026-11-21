import type { SQLiteDatabase } from 'expo-sqlite';

import { toBool } from '@/db/client';
import type { Profile } from '@/types/models';

const PROFILE_COLUMNS = `
  id, display_name AS displayName, relation, birth_date AS birthDate, sex, blood_type AS bloodType,
  avatar_uri AS avatarUri, is_default AS isDefault, is_remote AS isRemote, note,
  remote_id AS remoteId, synced_at AS syncedAt,
  created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt`;

type ProfileRow = Omit<Profile, 'isDefault' | 'isRemote'> & { isDefault: number; isRemote: number };

function mapProfile(row: ProfileRow): Profile {
  return { ...row, isDefault: toBool(row.isDefault), isRemote: toBool(row.isRemote) };
}

/** Các hồ sơ còn hiệu lực; hồ sơ mặc định đứng đầu. */
export async function listProfiles(db: SQLiteDatabase): Promise<Profile[]> {
  const rows = await db.getAllAsync<ProfileRow>(
    `SELECT ${PROFILE_COLUMNS} FROM profiles
     WHERE deleted_at IS NULL
     ORDER BY is_default DESC, created_at ASC`,
    [],
  );
  return rows.map(mapProfile);
}

/** Hồ sơ mặc định (thường là "bản thân"); nếu chưa đặt thì lấy hồ sơ tạo sớm nhất. */
export async function getDefaultProfile(db: SQLiteDatabase): Promise<Profile | null> {
  const row = await db.getFirstAsync<ProfileRow>(
    `SELECT ${PROFILE_COLUMNS} FROM profiles
     WHERE deleted_at IS NULL
     ORDER BY is_default DESC, created_at ASC LIMIT 1`,
    [],
  );
  return row ? mapProfile(row) : null;
}

export async function countProfiles(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM profiles WHERE deleted_at IS NULL',
    [],
  );
  return row?.total ?? 0;
}
