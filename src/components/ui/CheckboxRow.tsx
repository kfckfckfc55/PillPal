import { Pressable } from 'react-native';

import { useTheme } from '@/theme';

import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

export interface CheckboxRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Ô đánh dấu cả hàng bấm được. Luôn bắt đầu ở trạng thái CHƯA chọn (không tick sẵn). */
export function CheckboxRow({ label, checked, onChange }: CheckboxRowProps) {
  const { colors, spacing, radius, touch } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => ({
        minHeight: touch.primary + spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        borderWidth: checked ? 2 : 1,
        borderColor: checked ? colors.primary : colors.border,
        backgroundColor: checked
          ? colors.primaryContainer
          : pressed
            ? colors.surfaceVariant
            : colors.surface,
      })}
    >
      <AppIcon
        name={checked ? 'checkbox' : 'square-outline'}
        color={checked ? 'primary' : 'textSecondary'}
        size={28}
      />
      <AppText style={{ flex: 1 }} color={checked ? 'onPrimaryContainer' : 'textPrimary'}>
        {label}
      </AppText>
    </Pressable>
  );
}
