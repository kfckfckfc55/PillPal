import type { SQLiteDatabase } from 'expo-sqlite';

import {
  DEFAULT_WEEK_PATTERN,
  type RoutineConfig,
  type RoutineTimes,
} from '@/features/medications/scheduling';
import type { DayType, RoutineAnchorKind } from '@/types/models';
import { nowIso } from '@/utils/date';
import { newId } from '@/utils/id';

/** Giờ sinh hoạt, loại ngày theo thứ và ngày đổi riêng của các hồ sơ. */

interface AnchorRow {
  profileId: string;
  dayType: DayType;
  anchor: RoutineAnchorKind;
  timeOfDay: string;
}

interface PatternRow {
  profileId: string;
  weekday: number;
  dayType: DayType;
}

interface OverrideRow {
  profileId: string;
  date: string;
  dayType: DayType;
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

/** Đọc cấu hình sinh hoạt cho nhiều hồ sơ một lúc. Hồ sơ chưa đặt gì → cấu hình mặc định. */
export async function loadRoutineConfigs(
  db: SQLiteDatabase,
  profileIds: readonly string[],
): Promise<Map<string, RoutineConfig>> {
  const result = new Map<string, RoutineConfig>();
  if (profileIds.length === 0) return result;
  const inList = placeholders(profileIds.length);

  const [anchors, patterns, overrides] = await Promise.all([
    db.getAllAsync<AnchorRow>(
      `SELECT profile_id AS profileId, day_type AS dayType, anchor, time_of_day AS timeOfDay
       FROM routine_anchors WHERE deleted_at IS NULL AND profile_id IN (${inList})`,
      [...profileIds],
    ),
    db.getAllAsync<PatternRow>(
      `SELECT profile_id AS profileId, weekday, day_type AS dayType
       FROM routine_day_patterns WHERE profile_id IN (${inList})`,
      [...profileIds],
    ),
    db.getAllAsync<OverrideRow>(
      `SELECT profile_id AS profileId, date, day_type AS dayType
       FROM routine_day_overrides WHERE profile_id IN (${inList})`,
      [...profileIds],
    ),
  ]);

  for (const profileId of profileIds) {
    const anchorMap: Partial<Record<DayType, RoutineTimes>> = {};
    for (const row of anchors) {
      if (row.profileId !== profileId) continue;
      anchorMap[row.dayType] = { ...anchorMap[row.dayType], [row.anchor]: row.timeOfDay };
    }

    const weekPattern = [...DEFAULT_WEEK_PATTERN];
    for (const row of patterns) {
      if (row.profileId === profileId && row.weekday >= 0 && row.weekday <= 6) {
        weekPattern[row.weekday] = row.dayType;
      }
    }

    const overrideMap: Record<string, DayType> = {};
    for (const row of overrides) {
      if (row.profileId === profileId) overrideMap[row.date] = row.dayType;
    }

    result.set(profileId, { anchors: anchorMap, weekPattern, overrides: overrideMap });
  }
  return result;
}

export async function loadRoutineConfig(db: SQLiteDatabase, profileId: string): Promise<RoutineConfig> {
  const configs = await loadRoutineConfigs(db, [profileId]);
  return configs.get(profileId) ?? { anchors: {}, weekPattern: DEFAULT_WEEK_PATTERN, overrides: {} };
}

export interface SaveRoutineInput {
  /** Giờ sinh hoạt đầy đủ theo từng loại ngày. */
  anchors: Record<DayType, Record<RoutineAnchorKind, string>>;
  /** Loại ngày theo thứ (độ dài 7). */
  weekPattern: readonly DayType[];
}

/** Lưu toàn bộ giờ sinh hoạt + lịch tuần của một hồ sơ trong một transaction. */
export async function saveRoutine(
  db: SQLiteDatabase,
  profileId: string,
  input: SaveRoutineInput,
): Promise<void> {
  const stamp = nowIso();
  await db.withTransactionAsync(async () => {
    for (const [dayType, times] of Object.entries(input.anchors) as [DayType, Record<RoutineAnchorKind, string>][]) {
      for (const [anchor, time] of Object.entries(times) as [RoutineAnchorKind, string][]) {
        await db.runAsync(
          `INSERT INTO routine_anchors (id, profile_id, day_type, anchor, time_of_day, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(profile_id, day_type, anchor) DO UPDATE SET
             time_of_day = excluded.time_of_day, updated_at = excluded.updated_at, deleted_at = NULL`,
          [newId(), profileId, dayType, anchor, time, stamp, stamp],
        );
      }
    }
    for (const [weekday, dayType] of input.weekPattern.entries()) {
      if (weekday > 6) break;
      await db.runAsync(
        `INSERT INTO routine_day_patterns (id, profile_id, weekday, day_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(profile_id, weekday) DO UPDATE SET
           day_type = excluded.day_type, updated_at = excluded.updated_at`,
        [newId(), profileId, weekday, dayType, stamp, stamp],
      );
    }
  });
}

/** Đổi loại ngày cho riêng một ngày; `dayType = null` → bỏ đổi, quay về theo lịch tuần. */
export async function setDayOverride(
  db: SQLiteDatabase,
  profileId: string,
  dateKey: string,
  dayType: DayType | null,
): Promise<void> {
  if (dayType === null) {
    await db.runAsync('DELETE FROM routine_day_overrides WHERE profile_id = ? AND date = ?', [
      profileId,
      dateKey,
    ]);
    return;
  }
  const stamp = nowIso();
  await db.runAsync(
    `INSERT INTO routine_day_overrides (id, profile_id, date, day_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(profile_id, date) DO UPDATE SET
       day_type = excluded.day_type, updated_at = excluded.updated_at`,
    [newId(), profileId, dateKey, dayType, stamp, stamp],
  );
}

/** Xóa các ngày đổi riêng đã qua (dọn dẹp, giữ lại 7 ngày gần nhất). */
export async function pruneDayOverrides(db: SQLiteDatabase, beforeDateKey: string): Promise<void> {
  await db.runAsync('DELETE FROM routine_day_overrides WHERE date < ?', [beforeDateKey]);
}
