import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import {
  AppText,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  ProgressBar,
  Screen,
} from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import type { DoseEventWithMedication } from '@/db/repositories/doseEventRepository';
import { buildDoseHistory, sumCounts, type DoseCounts } from '@/features/history/doseHistory';
import { useDoseHistory } from '@/features/history/useDoseHistory';
import { useResolvedProfile } from '@/features/profiles/useResolvedProfile';
import { doseTitle } from '@/features/today/components/DoseRow';
import { describeDoseStatus } from '@/features/today/doseDisplay';
import type { SideEffectLog } from '@/types/models';
import { useTheme } from '@/theme';
import { formatTime, formatWeekdayDate } from '@/utils/format';

const copy = strings.history;

function CountsLine({ counts }: { counts: DoseCounts }) {
  const { spacing } = useTheme();
  const parts = [
    counts.late > 0 ? copy.countLate(counts.late) : null,
    counts.skipped > 0 ? copy.countSkipped(counts.skipped) : null,
    counts.missed > 0 ? copy.countMissed(counts.missed) : null,
    counts.paused > 0 ? copy.countPaused(counts.paused) : null,
  ].filter((part): part is string => part !== null);
  if (parts.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md }}>
      {parts.map((part) => (
        <AppText key={part} variant="bodySmall" color="textSecondary">
          {part}
        </AppText>
      ))}
    </View>
  );
}

function HistoryDoseRow({
  dose,
  now,
  sideEffects,
  showDivider,
}: {
  dose: DoseEventWithMedication;
  now: Date;
  sideEffects: readonly SideEffectLog[];
  showDivider: boolean;
}) {
  const { colors, spacing } = useTheme();
  const status = describeDoseStatus(dose, now);
  return (
    <View
      accessible
      accessibilityLabel={`${formatTime(dose.scheduledAt)}, ${doseTitle(dose)}, ${status.label}`}
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderTopWidth: showDivider ? 1 : 0,
        borderTopColor: colors.border,
      }}
    >
      <AppText variant="label" style={{ minWidth: 56 }}>
        {formatTime(dose.scheduledAt)}
      </AppText>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <AppText>{doseTitle(dose)}</AppText>
        <Badge tone={status.tone} icon={status.icon} label={status.label} />
        {sideEffects.length > 0 ? (
          <AppText variant="bodySmall" color="textSecondary">
            {sideEffects
              .map((log) =>
                log.tag === 'other' && log.note
                  ? `${strings.sideEffects.tags.other}: ${log.note}`
                  : strings.sideEffects.tags[log.tag],
              )
              .join(' · ')}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { spacing } = useTheme();
  const { profileId } = useLocalSearchParams<{ profileId?: string }>();
  const profileState = useResolvedProfile(profileId);
  const profile = profileState.status === 'ready' ? profileState.profile : null;
  const { state, retry } = useDoseHistory(profile?.id ?? null);

  if (profileState.status === 'missing') {
    return (
      <Screen centered>
        <EmptyState icon="person-outline" title={strings.profiles.notFound} />
      </Screen>
    );
  }
  if (profileState.status === 'error' || state.status === 'error') {
    const message =
      profileState.status === 'error' ? profileState.message : state.status === 'error' ? state.message : '';
    return (
      <Screen centered>
        <ErrorState message={`${copy.loadError}\n${message}`} onRetry={retry} />
      </Screen>
    );
  }
  if (!profile || state.status === 'loading') {
    return (
      <Screen centered>
        <LoadingState />
      </Screen>
    );
  }

  const days = buildDoseHistory(state.doses, state.now);
  const total = sumCounts(days);

  return (
    <Screen safeBottom>
      <AppText color="textSecondary">{copy.forProfile(profile.displayName)}</AppText>

      {state.doses.length === 0 ? (
        <Card>
          <EmptyState icon="calendar-outline" title={copy.empty} />
        </Card>
      ) : (
        <>
          <Card variant="highlight">
            <AppText variant="subtitle" color="onPrimaryContainer">
              {copy.summaryTitle}
            </AppText>
            <AppText color="onPrimaryContainer">{copy.summaryTaken(total.taken, total.due)}</AppText>
            <ProgressBar value={total.taken} max={total.due} accessibilityLabel={copy.summaryTaken(total.taken, total.due)} />
            <CountsLine counts={total} />
          </Card>

          {days.map((day) => (
            <Card key={day.dateKey}>
              <View style={{ gap: spacing.xs }}>
                <AppText variant="subtitle" accessibilityRole="header">
                  {formatWeekdayDate(day.date)}
                </AppText>
                {day.doses.length > 0 ? (
                  <>
                    <AppText color="textSecondary">{copy.dayTaken(day.counts.taken, day.counts.due)}</AppText>
                    <CountsLine counts={day.counts} />
                  </>
                ) : (
                  <AppText color="textSecondary">{copy.noDoses}</AppText>
                )}
              </View>
              {day.doses.map((dose, index) => (
                <HistoryDoseRow
                  key={dose.id}
                  dose={dose}
                  now={state.now}
                  sideEffects={state.sideEffects.filter((log) => log.doseEventId === dose.id)}
                  showDivider={index > 0}
                />
              ))}
            </Card>
          ))}
        </>
      )}

      <AppText variant="bodySmall" color="textSecondary">
        {copy.note}
      </AppText>
    </Screen>
  );
}
