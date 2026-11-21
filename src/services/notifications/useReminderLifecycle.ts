import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useEffect } from 'react';
import { AccessibilityInfo, Alert, AppState } from 'react-native';

import { strings } from '@/constants/strings.vi';
import { doseTitle } from '@/features/today/components/DoseRow';
import { requestTodayRefresh, setTodayIntent } from '@/features/today/todayIntents';
import {
  formatUtcOffset,
  resolveTimeZoneChoice,
  scheduleShiftMinutes,
} from '@/features/medications/timeZone';
import { formatTimeOfDay } from '@/utils/date';

import { handleReminderResponse, responseKey } from './reminderResponses';
import { cancelAllReminders, configureNotifications, refreshReminders } from './reminderService';
import { applyTimeZoneChoice, detectTimeZoneChange } from './timeZoneCheck';

/** Gọi API thông báo đồng bộ một cách an toàn (máy / môi trường không hỗ trợ → bỏ qua, không làm sập app). */
function safely<T>(label: string, run: () => T): T | null {
  try {
    return run();
  } catch (error) {
    console.warn(`[reminders] ${label}`, error);
    return null;
  }
}

/** Các lần bấm trên thông báo đã xử lý (tránh xử lý 2 lần khi app vừa được mở bằng thông báo). */
const handledResponses = new Set<string>();
let timeZonePromptOpen = false;

function refreshAll(db: SQLiteDatabase): void {
  refreshReminders(db)
    .catch((error: unknown) => console.warn('[reminders] Không cập nhật được nhắc thuốc', error))
    .finally(requestTodayRefresh);
}

async function checkTimeZone(db: SQLiteDatabase): Promise<void> {
  if (timeZonePromptOpen) return;
  const change = await detectTimeZoneChange(db);
  if (!change) return;
  timeZonePromptOpen = true;
  const copy = strings.reminders.timeZone;
  const from = formatUtcOffset(change.state.lastSeen?.offsetMinutes ?? change.current.offsetMinutes);
  const to = formatUtcOffset(change.current.offsetMinutes);
  // VD minh họa: 08:00 giờ cũ tương ứng mấy giờ hiện tại nếu chọn "Giữ như giờ cũ".
  const keepShift = scheduleShiftMinutes(
    resolveTimeZoneChoice(change.state, change.current, 'keep_interval'),
    change.current.offsetMinutes,
  );
  const choose = (mode: 'local' | 'keep_interval') => {
    timeZonePromptOpen = false;
    applyTimeZoneChoice(db, change, mode)
      .then(() => refreshAll(db))
      .catch((error: unknown) => console.error('[reminders] Không lưu được lựa chọn múi giờ', error));
  };
  Alert.alert(
    copy.title,
    copy.message(from, to, formatTimeOfDay(8 * 60 + keepShift)),
    [
      { text: copy.keepInterval, onPress: () => choose('keep_interval') },
      { text: copy.followLocal, onPress: () => choose('local') },
    ],
    { cancelable: false },
  );
}

/**
 * Vòng đời nhắc thuốc ở gốc ứng dụng (chỉ chạy khi người dùng đã đồng ý xử lý dữ liệu):
 * - mở app / quay lại app → sinh cữ, lên lịch lại thông báo, kiểm tra đổi múi giờ;
 * - xử lý nút Đã uống / Nhắc lại / Bỏ qua trên thông báo (kể cả khi thông báo mở app đang tắt);
 * - rút lại sự đồng ý → hủy toàn bộ thông báo nhắc thuốc.
 */
export function useReminderLifecycle(db: SQLiteDatabase, accepted: boolean): void {
  useEffect(() => {
    if (!accepted) {
      cancelAllReminders(db).catch((error: unknown) => console.warn('[reminders] Không hủy được thông báo', error));
      return undefined;
    }

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const key = responseKey(response);
      if (handledResponses.has(key)) return;
      handledResponses.add(key);
      handleReminderResponse(db, response)
        .then((outcome) => {
          safely('Không xóa được phản hồi thông báo', () => Notifications.clearLastNotificationResponse());
          switch (outcome.type) {
            case 'none':
              break;
            case 'show':
              setTodayIntent({ profileId: outcome.profileId });
              break;
            case 'late':
              setTodayIntent({ profileId: outcome.dose.profileId, lateDose: outcome.dose });
              break;
            case 'taken':
              AccessibilityInfo.announceForAccessibility(strings.reminders.handledTaken(doseTitle(outcome.dose)));
              setTodayIntent({ profileId: outcome.dose.profileId });
              break;
            case 'snoozed':
            case 'skipped':
              setTodayIntent({ profileId: outcome.dose.profileId });
              break;
          }
          if (outcome.type !== 'none') router.navigate('/');
          refreshAll(db);
        })
        .catch((error: unknown) => {
          console.error('[reminders] Không xử lý được thao tác trên thông báo', error);
          Alert.alert(strings.common.errorTitle, strings.reminders.actionFailed);
        });
    };

    configureNotifications().catch((error: unknown) =>
      console.warn('[reminders] Không cấu hình được thông báo', error),
    );
    refreshAll(db);
    checkTimeZone(db).catch((error: unknown) => console.warn('[reminders] Không kiểm tra được múi giờ', error));

    // App được mở bằng cách bấm thông báo khi đang tắt hẳn.
    const last = safely('Không đọc được thông báo vừa bấm', () => Notifications.getLastNotificationResponse());
    if (last) handleResponse(last);

    const responseSubscription = safely('Không nghe được thao tác trên thông báo', () =>
      Notifications.addNotificationResponseReceivedListener(handleResponse),
    );
    // Thông báo đến khi app đang mở → cập nhật trạng thái "Đến giờ uống" trên màn hình.
    const receivedSubscription = safely('Không nghe được thông báo đến', () =>
      Notifications.addNotificationReceivedListener(() => requestTodayRefresh()),
    );
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      refreshAll(db);
      checkTimeZone(db).catch((error: unknown) => console.warn('[reminders] Không kiểm tra được múi giờ', error));
    });

    return () => {
      responseSubscription?.remove();
      receivedSubscription?.remove();
      appStateSubscription.remove();
    };
  }, [db, accepted]);
}
