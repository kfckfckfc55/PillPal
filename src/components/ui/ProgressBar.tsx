import { View } from 'react-native';

import { useTheme, type ColorTokenName } from '@/theme';

export interface ProgressBarProps {
  value: number;
  max: number;
  /** Mô tả cho trình đọc màn hình, VD "Đã uống 2/3 cữ". */
  accessibilityLabel: string;
  color?: ColorTokenName;
}

export function ProgressBar({ value, max, accessibilityLabel, color = 'success' }: ProgressBarProps) {
  const { colors, radius, sickDayMode } = useTheme();
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max, now: value }}
      style={{
        height: sickDayMode ? 14 : 10,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceVariant,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: colors[color] }} />
    </View>
  );
}
