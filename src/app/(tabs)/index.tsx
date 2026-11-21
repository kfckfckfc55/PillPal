import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { ErrorState, LoadingState, Screen } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { useDatabase } from '@/db/DatabaseProvider';
import { CreateProfileCard } from '@/features/profiles/CreateProfileCard';
import { NormalHome } from '@/features/today/NormalHome';
import { SickDayHome } from '@/features/today/SickDayHome';
import { subscribeTodayIntents, takeTodayIntent } from '@/features/today/todayIntents';
import { useDoseActions } from '@/features/today/useDoseActions';
import { useTodayData } from '@/features/today/useTodayData';
import { refreshReminders } from '@/services/notifications/reminderService';
import { switchToLocalTime } from '@/services/notifications/timeZoneCheck';
import { useReminderPermission } from '@/services/notifications/useReminderPermission';
import { useTheme } from '@/theme';

const copy = strings.today;

export default function TodayScreen() {
  const { sickDayMode, setSickDayMode } = useTheme();
  // null = hồ sơ mặc định. Chọn hồ sơ chỉ giữ trong phiên (chuyển hồ sơ đầy đủ ở Milestone 5).
  const [profileId, setProfileId] = useState<string | null>(null);
  const { state, refreshing, refresh, reload, retry } = useTodayData(profileId);
  const actions = useDoseActions(reload);
  const { openLate } = actions;
  const db = useDatabase();
  const router = useRouter();
  const { permission } = useReminderPermission();

  // Yêu cầu từ thông báo (bấm Đã uống / Nhắc lại / Bỏ qua, thông báo đến khi app đang mở…).
  useEffect(
    () =>
      subscribeTodayIntents(() => {
        const intent = takeTodayIntent();
        if (intent) {
          setProfileId(intent.profileId);
          if (intent.lateDose) openLate(intent.lateDose);
        }
        reload();
      }),
    [reload, openLate],
  );

  const handleSwitchToLocalTime = () => {
    switchToLocalTime(db)
      .then(() => refreshReminders(db))
      .catch((error: unknown) => console.error('[today] Không đổi được múi giờ', error))
      .finally(reload);
  };

  if (state.status === 'loading') {
    return (
      <Screen centered>
        <LoadingState />
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen centered>
        <ErrorState message={`${copy.loadError}\n${state.message}`} onRetry={retry} />
      </Screen>
    );
  }

  if (sickDayMode) {
    return (
      <>
        <SickDayHome
          data={state.status === 'ready' ? state.data : null}
          onTurnOff={() => setSickDayMode(false)}
          actions={actions}
        />
        {actions.sheet}
      </>
    );
  }

  if (state.status === 'empty') {
    // Bản cài mới (không có dữ liệu mẫu): tạo hồ sơ đầu tiên rồi tải lại màn hình.
    return (
      <Screen centered keyboardAware>
        <CreateProfileCard onCreated={retry} />
      </Screen>
    );
  }

  return (
    <>
      <NormalHome
        data={state.data}
        refreshing={refreshing}
        onRefresh={refresh}
        onSelectProfile={setProfileId}
        onEnableSickDay={() => setSickDayMode(true)}
        actions={actions}
        remindersOff={permission !== null && permission.status !== 'granted' && state.data.medications.length > 0}
        onEnableReminders={() => router.push('/reminders-permission')}
        onSwitchToLocalTime={handleSwitchToLocalTime}
      />
      {actions.sheet}
    </>
  );
}
