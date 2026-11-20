import { Pressable, Switch, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppIcon, type IconName } from './AppIcon';
import { AppText } from './AppText';

export interface SwitchRowProps {
  label: string;
  description?: string;
  icon?: IconName;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

/** Hàng bật/tắt: chạm vào cả hàng (không chỉ công tắc nhỏ) để đổi trạng thái. */
export function SwitchRow({ label, description, icon, value, onValueChange }: SwitchRowProps) {
  const { colors, spacing, radius, touch } = useTheme();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => ({
        minHeight: touch.primary + spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.surfaceVariant : colors.surface,
      })}
    >
      {icon ? <AppIcon name={icon} color="primary" /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label">{label}</AppText>
        {description ? (
          <AppText variant="bodySmall" color="textSecondary">
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        // Track lúc tắt dùng textSecondary để công tắc vẫn rõ (tương phản ≥ 3:1) ở cả Sáng và Tối.
        trackColor={{ false: colors.textSecondary, true: colors.primary }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.textSecondary}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}
