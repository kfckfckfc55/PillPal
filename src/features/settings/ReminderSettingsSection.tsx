import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';

import { AppIcon, AppText, Button, Card, Section, SwitchRow } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { useDatabase } from '@/db/DatabaseProvider';
import { countReminderRecords } from '@/db/repositories/scheduledNotificationRepository';
import { readReminderSettings, saveHideMedicationNames } from '@/db/repositories/settingsRepository';
import { refreshReminders, sendTestReminder } from '@/services/notifications/reminderService';
import { useReminderPermission } from '@/services/notifications/useReminderPermission';
import { useTheme } from '@/theme';

const copy = strings.reminders.settings;

/** Cài đặt → Thông báo nhắc thuốc: trạng thái quyền, ẩn tên thuốc, gửi thử. */
export function ReminderSettingsSection() {
  const db = useDatabase();
  const router = useRouter();
  const { spacing } = useTheme();
  const { permission } = useReminderPermission();
  const [hideNames, setHideNames] = useState<boolean | null>(null);
  const [scheduledCount, setScheduledCount] = useState<number | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    Promise.all([readReminderSettings(db), countReminderRecords(db)]).then(
      ([settings, count]) => {
        if (cancelled) return;
        setHideNames(settings.hideMedicationNames);
        setScheduledCount(count);
      },
      (error: unknown) => console.warn('[settings] Không đọc được cài đặt thông báo', error),
    );
    return () => {
      cancelled = true;
    };
  }, [db]);

  useFocusEffect(load);

  function changeHideNames(hide: boolean) {
    setHideNames(hide);
    saveHideMedicationNames(db, hide)
      .then(() => refreshReminders(db))
      .catch((error: unknown) => {
        console.error('[settings] Không lưu được cài đặt ẩn tên thuốc', error);
        Alert.alert(strings.common.errorTitle, strings.common.errorMessage);
      });
  }

  function sendTest() {
    sendTestReminder().then(
      () => Alert.alert(copy.sendTest, copy.testScheduled),
      (error: unknown) => {
        console.error('[settings] Không gửi được thông báo thử', error);
        Alert.alert(strings.common.errorTitle, strings.common.errorMessage);
      },
    );
  }

  const status = permission?.status;
  const statusText =
    status === 'granted' ? copy.statusGranted : status === 'denied' ? copy.statusDenied : copy.statusUndetermined;

  return (
    <Section title={copy.title}>
      <Card>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <AppIcon
            name={status === 'granted' ? 'notifications' : 'notifications-off-outline'}
            color={status === 'granted' ? 'success' : 'warning'}
          />
          <AppText style={{ flex: 1 }} accessibilityLiveRegion="polite">
            {permission ? statusText : strings.common.loading}
          </AppText>
        </View>
        {status === 'granted' && scheduledCount !== null ? (
          <AppText variant="bodySmall" color="textSecondary">
            {copy.scheduledCount(scheduledCount)}
          </AppText>
        ) : null}
        {status === 'undetermined' || (status === 'denied' && permission?.canAskAgain) ? (
          <Button
            title={strings.reminders.banner.turnOn}
            icon="notifications-outline"
            onPress={() => router.push('/reminders-permission')}
          />
        ) : null}
        {status === 'denied' && !permission?.canAskAgain ? (
          <Button
            title={strings.reminders.permission.openSettings}
            icon="settings-outline"
            variant="outline"
            onPress={() => {
              Linking.openSettings().catch(() => undefined);
            }}
          />
        ) : null}
      </Card>

      <SwitchRow
        icon="eye-off-outline"
        label={copy.hideNamesLabel}
        description={copy.hideNamesDescription}
        value={hideNames ?? false}
        onValueChange={changeHideNames}
      />

      {status === 'granted' ? (
        <Button title={copy.sendTest} icon="paper-plane-outline" variant="outline" fullWidth onPress={sendTest} />
      ) : null}

      {Platform.OS === 'android' ? (
        <AppText variant="bodySmall" color="textSecondary">
          {copy.exactNote}
        </AppText>
      ) : null}
    </Section>
  );
}
