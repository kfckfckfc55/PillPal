import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getReminderPermission, type ReminderPermission } from './reminderService';

/** Trạng thái quyền thông báo; tự kiểm tra lại khi mở màn hình và khi quay lại app (VD từ Cài đặt của máy). */
export function useReminderPermission(): { permission: ReminderPermission | null; recheck: () => void } {
  const [permission, setPermission] = useState<ReminderPermission | null>(null);

  const recheck = useCallback(() => {
    getReminderPermission().then(setPermission, (error: unknown) => {
      console.warn('[reminders] Không đọc được quyền thông báo', error);
    });
  }, []);

  useFocusEffect(recheck);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') recheck();
    });
    return () => subscription.remove();
  }, [recheck]);

  return { permission, recheck };
}
