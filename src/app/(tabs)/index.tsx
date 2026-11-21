import { useState } from 'react';

import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { NormalHome } from '@/features/today/NormalHome';
import { SickDayHome } from '@/features/today/SickDayHome';
import { useTodayData } from '@/features/today/useTodayData';
import { useTheme } from '@/theme';

const copy = strings.today;

export default function TodayScreen() {
  const { sickDayMode, setSickDayMode } = useTheme();
  // null = hồ sơ mặc định. Chọn hồ sơ chỉ giữ trong phiên (chuyển hồ sơ đầy đủ ở Milestone 5).
  const [profileId, setProfileId] = useState<string | null>(null);
  const { state, refreshing, refresh, retry } = useTodayData(profileId);

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
      <SickDayHome
        data={state.status === 'ready' ? state.data : null}
        onTurnOff={() => setSickDayMode(false)}
      />
    );
  }

  if (state.status === 'empty') {
    return (
      <Screen centered>
        <EmptyState
          icon="person-add-outline"
          title={copy.noProfileTitle}
          description={copy.noProfileDescription}
        />
      </Screen>
    );
  }

  return (
    <NormalHome
      data={state.data}
      refreshing={refreshing}
      onRefresh={refresh}
      onSelectProfile={setProfileId}
      onEnableSickDay={() => setSickDayMode(true)}
    />
  );
}
