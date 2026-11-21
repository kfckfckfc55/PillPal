import type { SQLiteDatabase } from 'expo-sqlite';

import type { ThemePreference } from '@/theme/tokens';
import { nowIso } from '@/utils/date';

export type SettingKey = 'theme_preference' | 'sick_day_mode';

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
