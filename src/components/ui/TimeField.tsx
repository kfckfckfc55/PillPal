import { View } from 'react-native';

import { strings } from '@/constants/strings.vi';
import { useTheme } from '@/theme';
import { formatTimeOfDay, parseTimeOfDay } from '@/utils/date';

import { AppText } from './AppText';
import { Field } from './Field';
import { StepButton } from './StepButton';

export interface TimeFieldProps {
  label: string;
  /** "HH:mm" (24 giờ). */
  value: string;
  onChange: (value: string) => void;
  /** Bước phút (mặc định 5). */
  minuteStep?: number;
  hint?: string;
  error?: string;
  /** Ẩn nhãn phía trên (khi nhãn đã hiển thị ở chỗ khác trong cùng hàng). */
  hideLabel?: boolean;
}

function safeMinutes(value: string): number {
  try {
    return parseTimeOfDay(value);
  } catch {
    return 8 * 60;
  }
}

const pad2 = (value: number) => value.toString().padStart(2, '0');

/**
 * Chọn giờ bằng nút ▲/▼ cho giờ và phút (giờ 24h, không cần thư viện ngoài, dễ bấm với người lớn tuổi).
 * Giờ quay vòng 00–23; phút nhảy theo bước và tự làm tròn về bội số của bước.
 */
export function TimeField({ label, value, onChange, minuteStep = 5, hint, error, hideLabel = false }: TimeFieldProps) {
  const { spacing, colors, radius } = useTheme();
  const total = safeMinutes(value);
  const hour = Math.floor(total / 60);
  const minute = total % 60;

  const setHour = (next: number) => onChange(formatTimeOfDay(((next + 24) % 24) * 60 + minute));
  const stepMinute = (direction: 1 | -1) => {
    const aligned = direction > 0
      ? Math.floor(minute / minuteStep) * minuteStep + minuteStep
      : Math.ceil(minute / minuteStep) * minuteStep - minuteStep;
    onChange(formatTimeOfDay(hour * 60 + ((aligned + 60) % 60)));
  };

  const column = (
    text: string,
    unitLabel: string,
    onUp: () => void,
    onDown: () => void,
  ) => (
    <View style={{ alignItems: 'center', gap: spacing.xs }}>
      <StepButton icon="chevron-up" accessibilityLabel={strings.fields.increase(unitLabel)} onPress={onUp} />
      <View
        style={{
          minWidth: 64,
          paddingVertical: spacing.xs,
          borderRadius: radius.sm,
          backgroundColor: colors.surfaceVariant,
        }}
      >
        <AppText variant="display" align="center" accessibilityLabel={`${text} ${unitLabel}`}>
          {text}
        </AppText>
      </View>
      <StepButton icon="chevron-down" accessibilityLabel={strings.fields.decrease(unitLabel)} onPress={onDown} />
    </View>
  );

  const content = (
    <View
      accessible={false}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start' }}
    >
      {column(pad2(hour), strings.fields.hourOf(label), () => setHour(hour + 1), () => setHour(hour - 1))}
      <AppText variant="display" importantForAccessibility="no">
        :
      </AppText>
      {column(pad2(minute), strings.fields.minuteOf(label), () => stepMinute(1), () => stepMinute(-1))}
    </View>
  );

  if (hideLabel) return content;
  return (
    <Field label={label} hint={hint} error={error}>
      {content}
    </Field>
  );
}
