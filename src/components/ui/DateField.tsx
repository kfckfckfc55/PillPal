import { View } from 'react-native';

import { strings } from '@/constants/strings.vi';
import { useTheme } from '@/theme';
import { addDays, parseLocalDateKey, startOfLocalDay, toLocalDateKey } from '@/utils/date';
import { formatWeekdayDate } from '@/utils/format';

import { AppText } from './AppText';
import { Chip } from './Chip';
import { Field } from './Field';
import { StepButton } from './StepButton';

export interface DateFieldProps {
  label: string;
  /** "YYYY-MM-DD" (giờ địa phương). */
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
}

function safeDate(value: string): Date {
  try {
    return parseLocalDateKey(value);
  } catch {
    return startOfLocalDay(new Date());
  }
}

/** Chọn ngày bằng nút lùi / tới từng ngày + nút "Hôm nay" (đủ cho ngày bắt đầu dùng thuốc). */
export function DateField({ label, value, onChange, hint, error }: DateFieldProps) {
  const { spacing, colors, radius, touch } = useTheme();
  const date = safeDate(value);
  const todayKey = toLocalDateKey(new Date());

  return (
    <Field label={label} hint={hint} error={error}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <StepButton
          icon="chevron-back"
          accessibilityLabel={strings.fields.previousDay}
          onPress={() => onChange(toLocalDateKey(addDays(date, -1)))}
        />
        <View
          style={{
            flex: 1,
            minHeight: touch.min,
            justifyContent: 'center',
            paddingHorizontal: spacing.sm,
            borderRadius: radius.sm,
            backgroundColor: colors.surfaceVariant,
          }}
        >
          <AppText variant="label" align="center" accessibilityLiveRegion="polite">
            {formatWeekdayDate(date)}
          </AppText>
        </View>
        <StepButton
          icon="chevron-forward"
          accessibilityLabel={strings.fields.nextDay}
          onPress={() => onChange(toLocalDateKey(addDays(date, 1)))}
        />
      </View>
      {value !== todayKey ? (
        <View style={{ flexDirection: 'row' }}>
          <Chip label={strings.common.today} icon="today-outline" onPress={() => onChange(todayKey)} />
        </View>
      ) : null}
    </Field>
  );
}
