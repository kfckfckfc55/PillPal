import { View } from 'react-native';

import { AppText, Button, Card, EmptyState, Screen } from '@/components/ui';
import { MEDICAL_DISCLAIMER_SHORT } from '@/constants/disclaimer';
import { strings } from '@/constants/strings.vi';
import { getCourseProgress, getStockStatus } from '@/features/medications/stock';
import { useResponsive } from '@/hooks/useResponsive';
import { layout, useTheme } from '@/theme';
import { formatWeekdayDate } from '@/utils/format';

import { DoseRow } from './components/DoseRow';
import {
  DayProgressCard,
  LowStockCard,
  NextAppointmentCard,
  ProfileSwitcher,
  type LowStockItem,
} from './components/SummaryCards';
import { getDayProgress, groupDosesByPeriod } from './doseDisplay';
import type { TodayData } from './useTodayData';

const copy = strings.today;

export interface NormalHomeProps {
  data: TodayData;
  refreshing: boolean;
  onRefresh: () => void;
  onSelectProfile: (profileId: string) => void;
  onEnableSickDay: () => void;
}

/** Màn hình Hôm nay ở chế độ thường. Màn hình rộng (tablet / xoay ngang) → 2 cột. */
export function NormalHome({ data, refreshing, onRefresh, onSelectProfile, onEnableSickDay }: NormalHomeProps) {
  const { spacing } = useTheme();
  const { isWide } = useResponsive();
  const { now, profile, doses, medications, schedules } = data;

  const groups = groupDosesByPeriod(doses);
  const progress = getDayProgress(doses);
  const courseByMedication = new Map(medications.map((med) => [med.id, getCourseProgress(med, now)]));
  const lowStock: LowStockItem[] = medications.flatMap((medication) => {
    const stock = getStockStatus(medication, schedules, now);
    return stock?.isLow ? [{ medication, stock }] : [];
  });

  const doseColumn = (
    <View style={{ gap: spacing.lg }}>
      <AppText variant="title">{copy.dosesTitle}</AppText>
      {doses.length === 0 ? (
        <Card>
          <EmptyState icon="medkit-outline" title={copy.emptyTitle} description={copy.emptyDescription} />
        </Card>
      ) : (
        <>
          <DayProgressCard progress={progress} />
          {groups.map((group) => (
            <View key={group.period} style={{ gap: spacing.sm }}>
              <AppText variant="subtitle" accessibilityRole="header">
                {copy.periods[group.period]}
              </AppText>
              <Card style={{ paddingVertical: spacing.xs }}>
                {group.doses.map((dose, index) => (
                  <DoseRow
                    key={dose.id}
                    dose={dose}
                    now={now}
                    course={courseByMedication.get(dose.medicationId) ?? null}
                    showDivider={index > 0}
                  />
                ))}
              </Card>
            </View>
          ))}
          <AppText variant="bodySmall" color="textSecondary">
            {copy.actionsComingSoon}
          </AppText>
        </>
      )}
    </View>
  );

  const sideColumn = (
    <View style={{ gap: spacing.lg }}>
      <NextAppointmentCard appointment={data.nextAppointment} now={now} />
      <Card>
        <AppText variant="bodySmall" color="textSecondary">
          {MEDICAL_DISCLAIMER_SHORT}
        </AppText>
      </Card>
    </View>
  );

  return (
    <Screen
      maxWidth={isWide ? layout.wideContentMaxWidth : layout.contentMaxWidth}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ gap: spacing.xs }}>
        <AppText variant="display">{copy.greeting(profile.displayName)}</AppText>
        <AppText color="textSecondary">{formatWeekdayDate(now)}</AppText>
      </View>

      <ProfileSwitcher profiles={data.profiles} selectedId={profile.id} onSelect={onSelectProfile} />

      <Card variant="highlight">
        <AppText variant="label" color="onPrimaryContainer">
          {copy.sickDayPromptTitle}
        </AppText>
        <AppText color="onPrimaryContainer">{copy.sickDayPromptDescription}</AppText>
        <Button title={copy.sickDayPromptAction} icon="bed-outline" onPress={onEnableSickDay} />
      </Card>

      <LowStockCard items={lowStock} />

      {isWide ? (
        <View style={{ flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start' }}>
          <View style={{ flex: 3 }}>{doseColumn}</View>
          <View style={{ flex: 2 }}>{sideColumn}</View>
        </View>
      ) : (
        <>
          {doseColumn}
          {sideColumn}
        </>
      )}
    </Screen>
  );
}
