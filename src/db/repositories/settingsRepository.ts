import type { SQLiteDatabase } from 'expo-sqlite';

import type { TimeZoneMode, TimeZoneSnapshot, TimeZoneState } from '@/features/medications/timeZone';
import type { ThemePreference } from '@/theme/tokens';
import { nowIso } from '@/utils/date';

export type SettingKey =
  | 'theme_preference'
  | 'sick_day_mode'
  | 'hide_medication_names'
  | 'tz_last_seen'
  | 'tz_mode'
  | 'tz_reference_offset';

export interface PersistedAppSettings {
  themePreference: ThemePreference;
  sickDayMode: boolean;
}

export const DEFAULT_APP_SETTINGS: PersistedAppSettings = {
  themePreference: 'system',
  sickDayMode: false,
};

const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

function isThemePreference(value: string | null): value is ThemePreference {
  return value !== null && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export async function getSetting(db: SQLiteDatabase, key: SettingKey): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: SettingKey, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, nowIso()],
  );
}

/** Đọc cài đặt đã lưu; giá trị thiếu hoặc hỏng thì dùng mặc định. */
export async function readAppSettings(db: SQLiteDatabase): Promise<PersistedAppSettings> {
  const [theme, sickDay] = await Promise.all([
    getSetting(db, 'theme_preference'),
    getSetting(db, 'sick_day_mode'),
  ]);
  return {
    themePreference: isThemePreference(theme) ? theme : DEFAULT_APP_SETTINGS.themePreference,
    sickDayMode: sickDay === '1',
  };
}

export function saveThemePreference(db: SQLiteDatabase, preference: ThemePreference): Promise<void> {
  return setSetting(db, 'theme_preference', preference);
}

export function saveSickDayMode(db: SQLiteDatabase, enabled: boolean): Promise<void> {
  return setSetting(db, 'sick_day_mode', enabled ? '1' : '0');
}

// ---------------------------------------------------------------------------
// Milestone 2C: thông báo nhắc thuốc & múi giờ
// ---------------------------------------------------------------------------

export interface ReminderSettings {
  /** Ẩn tên thuốc trong nội dung thông báo. */
  hideMedicationNames: boolean;
}

export async function readReminderSettings(db: SQLiteDatabase): Promise<ReminderSettings> {
  return { hideMedicationNames: (await getSetting(db, 'hide_medication_names')) === '1' };
}

export function saveHideMedicationNames(db: SQLiteDatabase, hide: boolean): Promise<void> {
  return setSetting(db, 'hide_medication_names', hide ? '1' : '0');
}

function parseSnapshot(value: string | null): TimeZoneSnapshot | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<TimeZoneSnapshot>;
    if (typeof parsed.offsetMinutes !== 'number') return null;
    return { name: typeof parsed.name === 'string' ? parsed.name : null, offsetMinutes: parsed.offsetMinutes };
  } catch {
    return null;
  }
}

export async function readTimeZoneState(db: SQLiteDatabase): Promise<TimeZoneState> {
  const [lastSeen, mode, reference] = await Promise.all([
    getSetting(db, 'tz_last_seen'),
    getSetting(db, 'tz_mode'),
    getSetting(db, 'tz_reference_offset'),
  ]);
  const referenceNumber = reference === null ? Number.NaN : Number(reference);
  return {
    lastSeen: parseSnapshot(lastSeen),
    mode: (mode === 'keep_interval' ? 'keep_interval' : 'local') satisfies TimeZoneMode,
    referenceOffsetMinutes: Number.isFinite(referenceNumber) ? referenceNumber : null,
  };
}

export async function saveTimeZoneState(db: SQLiteDatabase, state: TimeZoneState): Promise<void> {
  await db.withTransactionAsync(async () => {
    await setSetting(db, 'tz_last_seen', JSON.stringify(state.lastSeen));
    await setSetting(db, 'tz_mode', state.mode);
    await setSetting(
      db,
      'tz_reference_offset',
      state.referenceOffsetMinutes === null ? '' : String(state.referenceOffsetMinutes),
    );
  });
}
