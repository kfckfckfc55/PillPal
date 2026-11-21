import * as Notifications from 'expo-notifications';
import {
  AndroidImportance,
  AndroidNotificationVisibility,
  IosAuthorizationStatus,
} from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { strings } from '@/constants/strings.vi';
import { listUpcomingReminderDoses } from '@/db/repositories/doseEventRepository';
import { countLocalProfiles } from '@/db/repositories/profileRepository';
import { replaceReminderRecords } from '@/db/repositories/scheduledNotificationRepository';
import { readReminderSettings } from '@/db/repositories/settingsRepository';
import { syncDoseEvents } from '@/features/medications/doseSyncService';
import { navyPalette } from '@/theme/tokens';

import { buildDoseReminderContent } from './reminderContent';
import { buildReminderPlan, diffReminders, isKebenReminder, type PlannedReminder } from './reminderPlan';

/**
 * Thông báo cục bộ nhắc uống thuốc (expo-notifications).
 * Mọi thông báo được tạo NGAY TRÊN MÁY — không dùng máy chủ đẩy (push), không gửi dữ liệu đi đâu.
 */

export const DOSE_CATEGORY_ID = 'keben-dose';
export const NOTIFICATION_CHANNELS = {
  medication: 'medication-reminders',
  appointment: 'appointments',
  general: 'general',
} as const;
export const REMINDER_ACTIONS = { take: 'take', snooze: 'snooze', skip: 'skip' } as const;
/** "Nhắc lại" từ nút trên thông báo. */
export const NOTIFICATION_SNOOZE_MINUTES = 10;

let configuring: Promise<void> | null = null;

/** Cấu hình một lần: cách hiện khi app đang mở, kênh Android, nút hành động. */
export function configureNotifications(): Promise<void> {
  if (!configuring) {
    configuring = doConfigure().catch((error: unknown) => {
      configuring = null;
      throw error;
    });
  }
  return configuring;
}

async function doConfigure(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const copy = strings.reminders;
  if (Platform.OS === 'android') {
    // Kênh phải có trước khi xin quyền (Android 13+).
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.medication, {
      name: copy.channels.medicationName,
      description: copy.channels.medicationDescription,
      importance: AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: navyPalette.navy700,
      // Màn hình khóa: theo cài đặt "ẩn nội dung nhạy cảm" của người dùng.
      lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
      showBadge: false,
    });
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.appointment, {
      name: copy.channels.appointmentName,
      description: copy.channels.appointmentDescription,
      importance: AndroidImportance.DEFAULT,
      lightColor: navyPalette.navy700,
      lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
    });
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.general, {
      name: copy.channels.generalName,
      description: copy.channels.generalDescription,
      importance: AndroidImportance.DEFAULT,
      lightColor: navyPalette.navy700,
    });
  }

  // Nút bấm mở app để ghi nhận chắc chắn vào dữ liệu trên máy (kể cả khi app đang tắt).
  await Notifications.setNotificationCategoryAsync(DOSE_CATEGORY_ID, [
    {
      identifier: REMINDER_ACTIONS.take,
      buttonTitle: copy.actions.take,
      options: { opensAppToForeground: true },
    },
    {
      identifier: REMINDER_ACTIONS.snooze,
      buttonTitle: copy.actions.snooze,
      options: { opensAppToForeground: true },
    },
    {
      identifier: REMINDER_ACTIONS.skip,
      buttonTitle: copy.actions.skip,
      options: { opensAppToForeground: true, isDestructive: true },
    },
  ]);
}

export type ReminderPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface ReminderPermission {
  status: ReminderPermissionStatus;
  /** false = hệ thống không cho hỏi lại → hướng dẫn mở Cài đặt của máy. */
  canAskAgain: boolean;
}

function toPermission(result: Notifications.NotificationPermissionsStatus): ReminderPermission {
  const provisional = result.ios?.status === IosAuthorizationStatus.PROVISIONAL;
  const status: ReminderPermissionStatus =
    result.granted || provisional ? 'granted' : result.status === 'undetermined' ? 'undetermined' : 'denied';
  return { status, canAskAgain: result.canAskAgain };
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

/** Hiện hộp thoại xin quyền của hệ thống (chỉ gọi sau màn hình giải thích). */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  await configureNotifications();
  return toPermission(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    }),
  );
}

async function scheduleOne(item: PlannedReminder): Promise<void> {
  const isDose = item.kind === 'dose';
  await Notifications.scheduleNotificationAsync({
    identifier: item.identifier,
    content: {
      title: item.title,
      body: item.body,
      data: isDose ? { kind: 'dose', doseId: item.doseId, profileId: item.profileId } : { kind: 'continuity' },
      categoryIdentifier: isDose ? DOSE_CATEGORY_ID : undefined,
      sound: 'default',
      color: navyPalette.navy700,
      threadIdentifier: isDose ? 'keben-doses' : 'keben-general',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: item.fireAt,
      channelId: isDose ? NOTIFICATION_CHANNELS.medication : NOTIFICATION_CHANNELS.general,
    },
  });
}

let reconcileQueue: Promise<unknown> = Promise.resolve();

/**
 * Đối chiếu thông báo đang hẹn trên máy với các cữ sắp tới: hủy cái thừa, đặt cái thiếu.
 * Chưa có quyền thông báo → chỉ dọn thông báo cũ. @returns số thông báo đang hẹn.
 */
export function reconcileReminders(db: SQLiteDatabase, now: Date = new Date()): Promise<number> {
  const run = reconcileQueue.then(() => runReconcile(db, now));
  reconcileQueue = run.catch(() => undefined);
  return run;
}

async function runReconcile(db: SQLiteDatabase, now: Date): Promise<number> {
  await configureNotifications();
  const [permission, scheduled] = await Promise.all([
    getReminderPermission(),
    Notifications.getAllScheduledNotificationsAsync(),
  ]);

  let planned: PlannedReminder[] = [];
  if (permission.status === 'granted') {
    const [doses, settings, profileCount] = await Promise.all([
      listUpcomingReminderDoses(db, now.toISOString()),
      readReminderSettings(db),
      countLocalProfiles(db),
    ]);
    const candidates = doses.map((dose) => {
      const fireAt = new Date(dose.status === 'snoozed' && dose.snoozeUntil ? dose.snoozeUntil : dose.scheduledAt);
      const content = buildDoseReminderContent({
        doseId: dose.id,
        profileId: dose.profileId,
        profileName: dose.profileName,
        showProfileName: profileCount > 1,
        medicationName: dose.medicationName,
        strength: dose.strength,
        doseAmount: dose.doseAmount,
        doseUnit: dose.doseUnit,
        mealRelation: dose.mealRelation,
        fireAt,
        isSnooze: dose.status === 'snoozed',
        hideMedicationNames: settings.hideMedicationNames,
      });
      return { doseId: dose.id, profileId: dose.profileId, fireAt, title: content.title, body: content.body };
    });
    planned = buildReminderPlan({
      candidates,
      now,
      continuity: {
        title: strings.reminders.content.continuityTitle,
        body: strings.reminders.content.continuityBody,
      },
    });
  }

  const changes = diffReminders(
    planned,
    scheduled.map((item) => item.identifier),
  );
  for (const identifier of changes.toCancel) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }
  for (const item of changes.toSchedule) {
    await scheduleOne(item);
  }

  await replaceReminderRecords(
    db,
    planned.map((item) => ({
      entityType: item.kind === 'dose' ? 'dose_event' : 'other',
      entityId: item.doseId ?? 'continuity',
      notificationId: item.identifier,
      fireAt: item.fireAt.toISOString(),
    })),
  );
  return planned.length;
}

/**
 * Cập nhật toàn bộ nhắc thuốc: sinh / dời cữ (đồng bộ cữ) rồi lên lịch lại thông báo.
 * Lỗi thông báo không làm hỏng việc lưu dữ liệu (chỉ ghi log).
 */
export async function refreshReminders(db: SQLiteDatabase, now: Date = new Date()): Promise<void> {
  await syncDoseEvents(db, now);
  try {
    await reconcileReminders(db, now);
  } catch (error) {
    console.warn('[reminders] Không lên lịch được thông báo', error);
  }
}

/** Hủy mọi thông báo nhắc thuốc của Kề Bên (VD khi người dùng rút lại sự đồng ý). */
export async function cancelAllReminders(db: SQLiteDatabase): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const item of scheduled) {
    if (isKebenReminder(item.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }
  }
  await replaceReminderRecords(db, []);
}

/** Thông báo thử sau 5 giây (định danh riêng, không bị lần lên lịch lại xóa mất). */
export async function sendTestReminder(): Promise<void> {
  await configureNotifications();
  await Notifications.scheduleNotificationAsync({
    identifier: `kebentest-${Date.now()}`,
    content: {
      title: strings.reminders.content.testTitle,
      body: strings.reminders.content.testBody,
      data: { kind: 'test' },
      sound: 'default',
      color: navyPalette.navy700,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: NOTIFICATION_CHANNELS.general,
    },
  });
}
