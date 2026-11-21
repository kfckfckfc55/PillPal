import { getCalendars } from 'expo-localization';
import type { SQLiteDatabase } from 'expo-sqlite';

import { listMedicationsForDoseSync } from '@/db/repositories/medicationRepository';
import { readTimeZoneState, saveTimeZoneState } from '@/db/repositories/settingsRepository';
import {
  hasTimeZoneChanged,
  offsetEastMinutes,
  resolveTimeZoneChoice,
  type TimeZoneMode,
  type TimeZoneSnapshot,
  type TimeZoneState,
} from '@/features/medications/timeZone';

/** Múi giờ hiện tại của máy. */
export function currentTimeZone(now: Date = new Date()): TimeZoneSnapshot {
  let name: string | null = null;
  try {
    name = getCalendars()[0]?.timeZone ?? null;
  } catch {
    name = null;
  }
  return { name, offsetMinutes: offsetEastMinutes(now) };
}

export interface PendingTimeZoneChange {
  state: TimeZoneState;
  current: TimeZoneSnapshot;
}

/**
 * Kiểm tra đổi múi giờ. Lần đầu → ghi nhận. Đổi múi giờ khi đang có thuốc → trả về để hỏi người dùng;
 * không có thuốc nào → tự theo giờ nơi mới.
 */
export async function detectTimeZoneChange(db: SQLiteDatabase): Promise<PendingTimeZoneChange | null> {
  const current = currentTimeZone();
  const state = await readTimeZoneState(db);
  if (!state.lastSeen) {
    await saveTimeZoneState(db, resolveTimeZoneChoice(state, current, 'local'));
    return null;
  }
  if (!hasTimeZoneChanged(state.lastSeen, current)) return null;
  const medications = await listMedicationsForDoseSync(db);
  if (medications.length === 0) {
    await saveTimeZoneState(db, resolveTimeZoneChoice(state, current, 'local'));
    return null;
  }
  return { state, current };
}

export async function applyTimeZoneChoice(
  db: SQLiteDatabase,
  change: PendingTimeZoneChange,
  choice: TimeZoneMode,
): Promise<void> {
  await saveTimeZoneState(db, resolveTimeZoneChoice(change.state, change.current, choice));
}

/** "Chuyển sang giờ nơi mới" từ màn hình Hôm nay. */
export async function switchToLocalTime(db: SQLiteDatabase): Promise<void> {
  const state = await readTimeZoneState(db);
  await saveTimeZoneState(db, resolveTimeZoneChoice(state, currentTimeZone(), 'local'));
}
