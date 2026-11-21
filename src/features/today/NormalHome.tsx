import { useRouter } from 'expo-router';
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
import type { DoseActionController } from './useDoseActions';
import type { TodayData } from './useTodayData';

const copy = strings.today;

export interface NormalHomeProps {
  data: TodayData;
  refreshing: boolean;
  onRefresh: () => void;
  onSelectProfile: (profileId: string) => void;
  onEnableSickDay: () => void;
  actions: DoseActionController;
}

/** Màn hình Hôm nay ở chế độ thường. Màn hình rộng (tablet / xoay ngang) → 2 cột. */
export function NormalHome({
  data,
  refreshing,
  onRefresh,
  onSelectProfile,
  onEnableSickDay,
  actions,
}: NormalHomeProps) {
  const router = useRouter();
  const { spacing } = useTheme();
  const { isWide } = useResponsive();
  const { now, profile, doses, medications, schedules } = data;

  const openAddMedication = () =>
    router.push({ pathname: '/medications/new', params: { profileId: profile.id } });
  const openMedicationList = () =>
    router.push({ pathname: '/medications', params: { profileId: profile.id } });
  const openRoutine = () => router.push({ pathname: '/routine', params: { profileId: profile.id } });
  const openHistory = () => router.push({ pathname: '/history', params: { profileId: profile.id } });

  const pauseReasonByMedication = new Map(data.openPauses.map((pause) => [pause.medicationId, pause.reason]));
  const sideEffectsOf = (doseId: string) => data.sideEffects.filter((log) => log.doseEventId === doseId);

  const groups = groupDosesByPeriod(doses);
  const progress = getDayProgress(doses);
  const courseByMedication = new Map(medications.map((med) => [med.id, getCourseProgress(med, now)]));
  const lowStock: LowStockItem[] = medications.flatMap((medication) => {
    const stock = getStockStatus(medication, schedules, now);
    return stock?.isLow ? [{ medication, stock }] : [];
  });

  const doseColumn = (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="title">{copy.dosesTitle}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.sm }}>
          <AppText variant="bodySmall" color="textSecondary">
            {copy.dayTypeLine(strings.routine.dayTypes[data.dayType])}
          </AppText>
          <Button title={copy.editRoutine} icon="time-outline" variant="ghost" onPress={openRoutine} />
        </View>
      </View>
      {doses.length === 0 ? (
        <Card>
          <EmptyState
            icon="medkit-outline"
            title={copy.emptyTitle}
            description={copy.emptyDescription}
            actionLabel={strings.medications.addMedication}
            onAction={openAddMedication}
          />
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
                    sideEffects={sideEffectsOf(dose.id)}
                    pauseReason={pauseReasonByMedication.get(dose.medicationId) ?? null}
                    actions={actions}
                  />
                ))}
              </Card>
            </View>
          ))}
        </>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Button title={strings.medications.addMedication} icon="add-circle-outline" onPress={openAddMedication} />
        <Button
          title={strings.medications.manageMedications}
          icon="list-outline"
          variant="outline"
          onPress={openMedicationList}
        />
        <Button title={strings.history.open} icon="calendar-number-outline" variant="outline" onPress={openHistory} />
      </View>
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
