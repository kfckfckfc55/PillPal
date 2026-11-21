import type { NotificationResponse } from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getDoseEventWithMedication,
  recordDoseTaken,
  skipDose,
  snoozeDose,
  type DoseEventWithMedication,
} from '@/db/repositories/doseEventRepository';
import { isVeryLate, resolveTakenStatus, snoozeUntil } from '@/features/medications/doseActions';

import { NOTIFICATION_SNOOZE_MINUTES, REMINDER_ACTIONS } from './reminderService';

export type ReminderOutcome =
  /** Không phải thông báo cữ thuốc / cữ không còn → chỉ mở app. */
  | { type: 'none' }
  /** Mở màn hình Hôm nay của hồ sơ. */
  | { type: 'show'; profileId: string }
  | { type: 'taken'; dose: DoseEventWithMedication }
  | { type: 'snoozed'; dose: DoseEventWithMedication }
  | { type: 'skipped'; dose: DoseEventWithMedication }
  /** Trễ nhiều → không tự ghi, mở bảng chọn giờ kèm lời nhắc hỏi bác sĩ / dược sĩ. */
  | { type: 'late'; dose: DoseEventWithMedication };

function doseIdOf(response: NotificationResponse): string | null {
  const data = response.notification.request.content.data as Record<string, unknown> | null | undefined;
  if (!data || data.kind !== 'dose' || typeof data.doseId !== 'string') return null;
  return data.doseId;
}

/** Khóa để không xử lý một lần bấm hai lần (sự kiện + "phản hồi gần nhất" khi app vừa mở). */
export function responseKey(response: NotificationResponse): string {
  return `${response.notification.request.identifier}|${response.actionIdentifier}|${response.notification.date}`;
}

/** Ghi nhận thao tác người dùng bấm trên thông báo vào dữ liệu trên máy. */
export async function handleReminderResponse(
  db: SQLiteDatabase,
  response: NotificationResponse,
  now: Date = new Date(),
): Promise<ReminderOutcome> {
  const doseId = doseIdOf(response);
  if (!doseId) return { type: 'none' };
  const dose = await getDoseEventWithMedication(db, doseId);
  if (!dose) return { type: 'none' };

  const stamp = now.toISOString();
  const waiting = dose.status === 'pending' || dose.status === 'snoozed';
  // Cữ đã được xử lý trong app (hoặc đang tạm dừng) → chỉ mở để xem, không ghi đè.
  if (!waiting) return { type: 'show', profileId: dose.profileId };

  switch (response.actionIdentifier) {
    case REMINDER_ACTIONS.take:
      if (isVeryLate(dose.scheduledAt, now)) return { type: 'late', dose };
      await recordDoseTaken(db, dose.id, stamp, resolveTakenStatus(dose.scheduledAt, now), stamp);
      return { type: 'taken', dose };
    case REMINDER_ACTIONS.snooze:
      await snoozeDose(db, dose.id, snoozeUntil(now, NOTIFICATION_SNOOZE_MINUTES).toISOString(), stamp);
      return { type: 'snoozed', dose };
    case REMINDER_ACTIONS.skip:
      await skipDose(db, dose.id, null, stamp);
      return { type: 'skipped', dose };
    default:
      return { type: 'show', profileId: dose.profileId };
  }
}
