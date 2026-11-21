import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import { AppIcon, AppText, Button, Card, LoadingState, Screen } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { useDatabase } from '@/db/DatabaseProvider';
import { refreshReminders, requestReminderPermission } from '@/services/notifications/reminderService';
import { useReminderPermission } from '@/services/notifications/useReminderPermission';
import { useTheme } from '@/theme';

const copy = strings.reminders.permission;

/**
 * Màn hình giải thích TRƯỚC khi hiện hộp thoại xin quyền của hệ thống (mục 5.5 của đặc tả).
 * Bị từ chối và không hỏi lại được → hướng dẫn mở Cài đặt của máy.
 */
export default function RemindersPermissionScreen() {
  const db = useDatabase();
  const router = useRouter();
  const { spacing, colors } = useTheme();
  const { permission, recheck } = useReminderPermission();
  const [busy, setBusy] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  function allow() {
    setBusy(true);
    requestReminderPermission()
      .then(async (result) => {
        if (result.status === 'granted') await refreshReminders(db);
      })
      .then(
        () => {
          setBusy(false);
          recheck();
        },
        (error: unknown) => {
          console.error('[reminders] Không xin được quyền thông báo', error);
          setBusy(false);
          Alert.alert(strings.common.errorTitle, copy.requestFailed);
        },
      );
  }

  if (!permission) {
    return (
      <Screen centered>
        <LoadingState />
      </Screen>
    );
  }

  if (permission.status === 'granted') {
    return (
      <Screen centered safeBottom>
        <Card>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <AppIcon name="notifications" color="success" />
            <AppText variant="title" style={{ flex: 1 }}>
              {copy.grantedTitle}
            </AppText>
          </View>
          <AppText>{copy.grantedDescription}</AppText>
        </Card>
        <Button title={copy.done} icon="checkmark" fullWidth onPress={close} />
      </Screen>
    );
  }

  const blocked = permission.status === 'denied';

  return (
    <Screen safeBottom>
      <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: blocked ? colors.surfaceVariant : colors.primaryContainer,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name={blocked ? 'notifications-off' : 'notifications'} color="primary" size={44} />
        </View>
        <AppText variant="display" align="center">
          {blocked ? copy.deniedTitle : copy.title}
        </AppText>
        <AppText align="center" color="textSecondary">
          {blocked ? copy.deniedDescription : copy.description}
        </AppText>
      </View>

      {!blocked ? (
        <Card>
          {copy.points.map((point) => (
            <View key={point} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
              <AppIcon name="checkmark-circle" color="success" size={20} />
              <AppText style={{ flex: 1 }}>{point}</AppText>
            </View>
          ))}
        </Card>
      ) : null}

      {blocked && !permission.canAskAgain ? (
        <Button
          title={copy.openSettings}
          icon="settings-outline"
          fullWidth
          onPress={() => {
            Linking.openSettings().catch(() => undefined);
          }}
        />
      ) : (
        <Button title={copy.allow} icon="notifications-outline" fullWidth loading={busy} onPress={allow} />
      )}
      <Button title={copy.later} variant="ghost" fullWidth onPress={close} />
    </Screen>
  );
}
