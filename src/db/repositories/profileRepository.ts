import type { SQLiteDatabase } from 'expo-sqlite';

import { toBool } from '@/db/client';
import type { Profile } from '@/types/models';
import { nowIso } from '@/utils/date';
import { newId } from '@/utils/id';

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

/** Một hồ sơ còn hiệu lực theo id. */
export async function getProfile(db: SQLiteDatabase, id: string): Promise<Profile | null> {
  const row = await db.getFirstAsync<ProfileRow>(
    `SELECT ${PROFILE_COLUMNS} FROM profiles WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row ? mapProfile(row) : null;
}

/**
 * Tạo hồ sơ "bản thân" đầu tiên trên máy (mặc định). Chỉ lưu tên gọi — tối thiểu hóa dữ liệu.
 * Hồ sơ cho người thân (có xác nhận quyền quản lý) làm ở Milestone 5.
 * @returns id hồ sơ.
 */
export async function createSelfProfile(db: SQLiteDatabase, displayName: string): Promise<string> {
  const id = newId();
  const stamp = nowIso();
  await db.runAsync(
    `INSERT INTO profiles (id, display_name, relation, is_default, is_remote, created_at, updated_at)
     VALUES (?, ?, 'self', ?, 0, ?, ?)`,
    [id, displayName.trim(), (await countProfiles(db)) === 0 ? 1 : 0, stamp, stamp],
  );
  return id;
}
