import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, type StatusTone } from '@/theme';

import { AppIcon, type IconName } from './AppIcon';
import { AppText } from './AppText';

export type BadgeTone = StatusTone | 'neutral';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Mặc định mỗi tông có icon riêng — trạng thái không bao giờ chỉ truyền đạt bằng màu. */
  icon?: IconName;
  /** VD: `{ alignSelf: 'center' }` để căn giữa (mặc định căn trái). */
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_ICONS: Record<BadgeTone, IconName> = {
  success: 'checkmark-circle',
  warning: 'alert-circle',
  danger: 'warning',
  info: 'information-circle',
  neutral: 'ellipse',
};

export function Badge({ label, tone = 'neutral', icon, style }: BadgeProps) {
  const { colors, spacing, radius } = useTheme();
  const background = tone === 'neutral' ? colors.primaryContainer : colors[tone];
  const foreground = tone === 'neutral' ? colors.onPrimaryContainer : colors.onStatus;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.pill,
          backgroundColor: background,
        },
        style,
      ]}
    >
      <AppIcon name={icon ?? DEFAULT_ICONS[tone]} rawColor={foreground} size={16} />
      <AppText variant="bodySmall" weight="600" style={{ color: foreground }}>
        {label}
      </AppText>
    </View>
  );
}
