import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  AppIcon,
  AppText,
  Button,
  Card,
  ChipGroup,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Screen,
  Section,
  TimeField,
  type ChipOption,
} from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { useDatabase } from '@/db/DatabaseProvider';
import { loadRoutineConfig, saveRoutine, setDayOverride } from '@/db/repositories/routineRepository';
import { DAY_TYPES, ROUTINE_ANCHORS, type RoutineConfig } from '@/features/medications/scheduling';
import { useResolvedProfile } from '@/features/profiles/useResolvedProfile';
import { refreshReminders } from '@/services/notifications/reminderService';
import {
  invalidDayTypes,
  routineFormFromConfig,
  type RoutineFormValues,
} from '@/features/routine/routineForm';
import type { DayType, Profile, RoutineAnchorKind } from '@/types/models';
import { useTheme } from '@/theme';
import { addDays, toLocalDateKey } from '@/utils/date';
import { formatDate } from '@/utils/format';

const copy = strings.routine;

type OverrideChoice = DayType | 'auto';

const DAY_TYPE_OPTIONS: readonly ChipOption<DayType>[] = DAY_TYPES.map((dayType) => ({
  value: dayType,
  label: copy.dayTypes[dayType],
}));

const DAY_TYPE_SHORT_OPTIONS: readonly ChipOption<DayType>[] = DAY_TYPES.map((dayType) => ({
  value: dayType,
  label: copy.dayTypesShort[dayType],
}));

/** Thứ Hai → Chủ nhật. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export default function RoutineScreen() {
  const { profileId } = useLocalSearchParams<{ profileId?: string }>();
  const profileState = useResolvedProfile(profileId);
  const db = useDatabase();
  const [config, setConfig] = useState<{ profileId: string; value: RoutineConfig } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const profile = profileState.status === 'ready' ? profileState.profile : null;

  useEffect(() => {
    if (!profile) return undefined;
    let cancelled = false;
    loadRoutineConfig(db, profile.id).then(
      (value) => {
        if (!cancelled) setConfig({ profileId: profile.id, value });
      },
      (error: unknown) => {
        if (cancelled) return;
        console.error('[routine] Không đọc được giờ sinh hoạt', error);
        setLoadError(error instanceof Error ? error.message : String(error));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db, profile, attempt]);

  if (profileState.status === 'missing') {
    return (
      <Screen centered>
        <EmptyState icon="person-outline" title={strings.profiles.notFound} />
      </Screen>
    );
  }
  if (profileState.status === 'error' || loadError) {
    return (
      <Screen centered>
        <ErrorState
          message={`${copy.loadError}\n${profileState.status === 'error' ? profileState.message : (loadError ?? '')}`}
          onRetry={() => {
            setLoadError(null);
            setAttempt((value) => value + 1);
          }}
        />
      </Screen>
    );
  }
  if (!profile || !config || config.profileId !== profile.id) {
    return (
      <Screen centered>
        <LoadingState />
      </Screen>
    );
  }
  return <RoutineEditor profile={profile} config={config.value} />;
}

function RoutineEditor({ profile, config }: { profile: Profile; config: RoutineConfig }) {
  const db = useDatabase();
  const router = useRouter();
  const { spacing, colors } = useTheme();
  const [today] = useState(() => new Date());
  const todayKey = toLocalDateKey(today);
  const tomorrow = addDays(today, 1);
  const tomorrowKey = toLocalDateKey(tomorrow);

  const [values, setValues] = useState<RoutineFormValues>(() =>
    routineFormFromConfig(config, todayKey, tomorrowKey),
  );
  const [editing, setEditing] = useState<DayType>('workday');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const invalid = submitted ? invalidDayTypes(values) : [];

  const setTime = (anchor: RoutineAnchorKind, time: string) =>
    setValues((previous) => ({
      ...previous,
      times: { ...previous.times, [editing]: { ...previous.times[editing], [anchor]: time } },
    }));

  const setWeekday = (weekday: number, dayType: DayType) =>
    setValues((previous) => {
      const weekPattern = [...previous.weekPattern];
      weekPattern[weekday] = dayType;
      return { ...previous, weekPattern };
    });

  const overrideOptions = (date: Date): ChipOption<OverrideChoice>[] => [
    {
      value: 'auto',
      label: copy.followWeek(copy.dayTypesShort[values.weekPattern[date.getDay()] ?? 'workday']),
    },
    ...DAY_TYPE_SHORT_OPTIONS,
  ];

  function handleSave() {
    setSubmitted(true);
    const errors = invalidDayTypes(values);
    if (errors.length > 0) {
      setEditing(errors[0] ?? 'workday');
      return;
    }
    if (saving) return;
    setSaving(true);
    (async () => {
      await saveRoutine(db, profile.id, { anchors: values.times, weekPattern: values.weekPattern });
      await setDayOverride(db, profile.id, todayKey, values.todayOverride);
      await setDayOverride(db, profile.id, tomorrowKey, values.tomorrowOverride);
      await refreshReminders(db);
    })().then(
      () => {
        setSaving(false);
        Alert.alert(copy.savedTitle, copy.savedMessage, [{ text: 'OK', onPress: () => router.back() }]);
      },
      (error: unknown) => {
        console.error('[routine] Không lưu được giờ sinh hoạt', error);
        setSaving(false);
        Alert.alert(strings.common.errorTitle, copy.saveFailed);
      },
    );
  }

  const errorCard =
    invalid.length > 0 ? (
      <Card>
        {invalid.map((dayType) => (
          <View key={dayType} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <AppIcon name="alert-circle" color="danger" />
            <AppText color="danger" style={{ flex: 1 }} accessibilityLiveRegion="polite">
              {copy.orderError(copy.dayTypes[dayType])}
            </AppText>
          </View>
        ))}
      </Card>
    ) : null;

  return (
    <Screen safeBottom>
      <View style={{ gap: spacing.xs }}>
        <AppText color="textSecondary">{copy.forProfile(profile.displayName)}</AppText>
        <AppText>{copy.intro}</AppText>
      </View>

      <Section title={copy.daysTitle} description={copy.daysDescription}>
        <Field label={copy.dayLabel(strings.common.today, formatDate(today))}>
          <ChipGroup<OverrideChoice>
            options={overrideOptions(today)}
            value={values.todayOverride ?? 'auto'}
            onChange={(choice) =>
              setValues((previous) => ({ ...previous, todayOverride: choice === 'auto' ? null : choice }))
            }
            accessibilityLabel={copy.dayLabel(strings.common.today, formatDate(today))}
          />
        </Field>
        <Field label={copy.dayLabel(strings.common.tomorrow, formatDate(tomorrow))}>
          <ChipGroup<OverrideChoice>
            options={overrideOptions(tomorrow)}
            value={values.tomorrowOverride ?? 'auto'}
            onChange={(choice) =>
              setValues((previous) => ({ ...previous, tomorrowOverride: choice === 'auto' ? null : choice }))
            }
            accessibilityLabel={copy.dayLabel(strings.common.tomorrow, formatDate(tomorrow))}
          />
        </Field>
      </Section>

      <Section title={copy.timesTitle}>
        <Field label={copy.editingDayTypeLabel}>
          <ChipGroup
            options={DAY_TYPE_OPTIONS}
            value={editing}
            onChange={setEditing}
            accessibilityLabel={copy.editingDayTypeLabel}
          />
        </Field>
        {errorCard}
        <Card>
          <AppText variant="subtitle">{copy.dayTypes[editing]}</AppText>
          {ROUTINE_ANCHORS.map((anchor, index) => (
            <View
              key={`${editing}-${anchor}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingTop: index > 0 ? spacing.sm : 0,
                borderTopWidth: index > 0 ? 1 : 0,
                borderTopColor: colors.border,
              }}
            >
              <AppText variant="label" style={{ flex: 1 }}>
                {copy.anchors[anchor]}
              </AppText>
              <TimeField
                label={copy.anchors[anchor]}
                value={values.times[editing][anchor]}
                onChange={(time) => setTime(anchor, time)}
                hideLabel
              />
            </View>
          ))}
          <AppText variant="bodySmall" color="textSecondary">
            {copy.bedtimeHint}
          </AppText>
        </Card>
      </Section>

      <Section title={copy.weekTitle} description={copy.weekDescription}>
        {WEEK_ORDER.map((weekday) => {
          const label = copy.weekdayLabel(strings.format.weekdays[weekday] ?? '');
          return (
            <Field key={weekday} label={label}>
              <ChipGroup
                options={DAY_TYPE_SHORT_OPTIONS}
                value={values.weekPattern[weekday] ?? 'workday'}
                onChange={(dayType) => setWeekday(weekday, dayType)}
                accessibilityLabel={label}
              />
            </Field>
          );
        })}
      </Section>

      {/* Nhắc lại lỗi ngay trên nút Lưu (người dùng thường đang ở cuối màn hình khi bấm). */}
      {errorCard}
      <Button title={copy.save} icon="checkmark-circle-outline" fullWidth loading={saving} onPress={handleSave} />
    </Screen>
  );
}
