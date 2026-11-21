import { Pressable } from 'react-native';

import { useTheme } from '@/theme';

import { AppIcon, type IconName } from './AppIcon';

export interface StepButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
}

/** Nút tròn −/+ (vùng chạm ≥ 48dp) dùng cho ô số, ô giờ, ô ngày. */
export function StepButton({ icon, accessibilityLabel, onPress, disabled = false }: StepButtonProps) {
  const { colors, touch } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: touch.min,
        height: touch.min,
        borderRadius: touch.min / 2,
        borderWidth: 1.5,
        borderColor: colors.primary,
        backgroundColor: pressed ? colors.primaryContainer : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <AppIcon name={icon} color="primary" />
    </Pressable>
  );
}
