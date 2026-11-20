import { Pressable, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppIcon, type IconName } from './AppIcon';
import { AppText } from './AppText';

export interface ChipProps {
  label: string;
  selected?: boolean;
  icon?: IconName;
  onPress?: () => void;
  disabled?: boolean;
}

/** Chip lựa chọn nhanh (VD: gắn tag tác dụng phụ). Đang chọn = nền navy + dấu tích. */
export function Chip({ label, selected = false, icon, onPress, disabled = false }: ChipProps) {
  const { colors, spacing, radius, touch } = useTheme();
  const foreground = selected ? colors.onPrimary : colors.textPrimary;
  const iconName: IconName | undefined = selected ? 'checkmark' : icon;

  const containerStyle: ViewStyle = {
    minHeight: touch.min,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: selected ? colors.primary : colors.border,
    backgroundColor: selected ? colors.primary : colors.surfaceVariant,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    opacity: disabled ? 0.5 : 1,
  };

  const content = (
    <>
      {iconName ? <AppIcon name={iconName} rawColor={foreground} size={18} /> : null}
      <AppText variant="bodySmall" weight="600" style={{ color: foreground }}>
        {label}
      </AppText>
    </>
  );

  if (!onPress) {
    return <View style={containerStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [containerStyle, pressed && !disabled ? { opacity: 0.8 } : null]}
    >
      {content}
    </Pressable>
  );
}
