import { View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Chip,
  ChipGroup,
  Field,
  RadioGroup,
  StepButton,
  TimeField,
  type RadioOption,
} from '@/components/ui';
import { strings } from '@/constants/strings.vi';
import { useTheme } from '@/theme';
import { formatTimeOfDay, parseTimeOfDay } from '@/utils/date';

import {
  DEFAULT_FIXED_TIME,
  nextDraftKey,
  selectedRoutinePresets,
  toggleRoutinePreset,
  type MedicationFormValues,
  type TimingMode,
} from '../medicationForm';
import { ROUTINE_PRESETS } from '../routinePresets';
import { describeRoutineAnchor } from '../scheduleText';
import {
  INTERVAL_HOURS_OPTIONS,
  anchorMinutes,
  resolveDayType,
  resolveRoutineTimes,
  type RoutineConfig,
} from '../scheduling';

const copy = strings.medications;

const TIMING_OPTIONS: readonly RadioOption<TimingMode>[] = [
  {
    value: 'routine',
    label: copy.timingModes.routine,
    description: copy.timingDescriptions.routine,
    icon: 'restaurant-outline',
  },
  { value: 'fixed', label: copy.timingModes.fixed, description: copy.timingDescriptions.fixed, icon: 'alarm-outline' },
  {
    value: 'interval',
    label: copy.timingModes.interval,
    description: copy.timingDescriptions.interval,
    icon: 'repeat-outline',
  },
];

export interface ScheduleEditorProps {
  values: MedicationFormValues;
  error?: string;
  onChange: (patch: Partial<MedicationFormValues>) => void;
  routine: RoutineConfig;
  today: Date;
}

/** Phần "Giờ uống" của form thuốc: theo sinh hoạt / giờ cố định / cách đều. */
export function ScheduleEditor({ values, error, onChange, routine, today }: ScheduleEditorProps) {
  const { spacing } = useTheme();

  function changeMode(timing: TimingMode) {
    if (timing === 'fixed' && values.fixedSlots.length === 0) {
      onChange({ timing, fixedSlots: [{ key: nextDraftKey(), id: null, time: DEFAULT_FIXED_TIME }] });
    } else {
      onChange({ timing });
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      <RadioGroup
        options={TIMING_OPTIONS}
        value={values.timing}
        onChange={changeMode}
        accessibilityLabel={copy.timingModeLabel}
      />

      {values.timing === 'routine' ? (
        <RoutineSlots values={values} onChange={onChange} routine={routine} today={today} />
      ) : null}
      {values.timing === 'fixed' ? <FixedSlots values={values} onChange={onChange} /> : null}
      {values.timing === 'interval' ? <IntervalSlots values={values} onChange={onChange} /> : null}

      {error ? (
        <AppText variant="bodySmall" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function RoutineSlots({
  values,
  onChange,
  routine,
  today,
}: Pick<ScheduleEditorProps, 'values' | 'onChange' | 'routine' | 'today'>) {
  const { spacing } = useTheme();
  const selected = selectedRoutinePresets(values.routineSlots);
  const times = resolveRoutineTimes(resolveDayType(today, routine), routine);
  const preview = values.routineSlots
    .map((slot) => ({
      label: describeRoutineAnchor(slot.anchor, slot.offsetMinutes),
      minutes: anchorMinutes(times, slot.anchor) + slot.offsetMinutes,
    }))
    .sort((a, b) => a.minutes - b.minutes);

  return (
    <View style={{ gap: spacing.md }}>
      <Field label={copy.routinePresetsLabel} hint={copy.routineHint}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {ROUTINE_PRESETS.map((preset) => (
            <Chip
              key={preset.id}
              label={copy.routinePresets[preset.id]}
              selected={selected.has(preset.id)}
              onPress={() => onChange({ routineSlots: toggleRoutinePreset(values.routineSlots, preset.id) })}
            />
          ))}
        </View>
      </Field>
      {preview.length > 0 ? (
        <Card>
          <AppText variant="label">{copy.routinePreviewTitle}</AppText>
          {preview.map((item) => (
            <AppText key={item.label}>
              {formatTimeOfDay(item.minutes)} · {item.label}
            </AppText>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

function FixedSlots({ values, onChange }: Pick<ScheduleEditorProps, 'values' | 'onChange'>) {
  const { spacing } = useTheme();

  const updateTime = (key: string, time: string) =>
    onChange({ fixedSlots: values.fixedSlots.map((slot) => (slot.key === key ? { ...slot, time } : slot)) });
  const remove = (key: string) => onChange({ fixedSlots: values.fixedSlots.filter((slot) => slot.key !== key) });
  const add = () => {
    const last = values.fixedSlots[values.fixedSlots.length - 1];
    // Gợi ý giờ mới cách giờ cuối 4 tiếng để không trùng.
    let time = DEFAULT_FIXED_TIME;
    if (last) {
      try {
        time = formatTimeOfDay(parseTimeOfDay(last.time) + 4 * 60);
      } catch {
        time = DEFAULT_FIXED_TIME;
      }
    }
    onChange({ fixedSlots: [...values.fixedSlots, { key: nextDraftKey(), id: null, time }] });
  };

  return (
    <View style={{ gap: spacing.md }}>
      {values.fixedSlots.map((slot, index) => {
        const label = copy.fixedTimeLabel(index + 1);
        return (
          <Card key={slot.key}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <AppText variant="label" style={{ minWidth: 56 }}>
                {label}
              </AppText>
              <View style={{ flex: 1 }}>
                <TimeField label={label} value={slot.time} onChange={(time) => updateTime(slot.key, time)} hideLabel />
              </View>
              {values.fixedSlots.length > 1 ? (
                <StepButton
                  icon="trash-outline"
                  accessibilityLabel={copy.removeTime(slot.time)}
                  onPress={() => remove(slot.key)}
                />
              ) : null}
            </View>
          </Card>
        );
      })}
      <Button title={copy.addTime} icon="add" variant="outline" onPress={add} />
    </View>
  );
}

function IntervalSlots({ values, onChange }: Pick<ScheduleEditorProps, 'values' | 'onChange'>) {
  const { spacing } = useTheme();
  const { interval } = values;
  let times = '';
  try {
    const start = parseTimeOfDay(interval.startTime);
    const count = Math.floor(24 / interval.intervalHours);
    times = Array.from({ length: count }, (_, index) =>
      formatTimeOfDay(start + index * interval.intervalHours * 60),
    ).join(' · ');
  } catch {
    times = '';
  }

  return (
    <View style={{ gap: spacing.md }}>
      <Field label={copy.intervalEveryLabel}>
        <ChipGroup
          options={INTERVAL_HOURS_OPTIONS.map((hours) => ({ value: hours, label: copy.intervalHours(hours) }))}
          value={interval.intervalHours}
          onChange={(intervalHours) => onChange({ interval: { ...interval, intervalHours } })}
          accessibilityLabel={copy.intervalEveryLabel}
        />
      </Field>
      <TimeField
        label={copy.intervalStartLabel}
        value={interval.startTime}
        onChange={(startTime) => onChange({ interval: { ...interval, startTime } })}
      />
      {times ? <AppText color="textSecondary">{copy.intervalPreview(times)}</AppText> : null}
    </View>
  );
}
