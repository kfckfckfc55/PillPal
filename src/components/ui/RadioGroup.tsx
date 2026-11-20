import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppIcon, type IconName } from './AppIcon';
import { AppText } from './AppText';

export interface RadioOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: IconName;
}

export interface RadioGroupProps<T extends string> {
  options: readonly RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

/** Danh sách lựa chọn 1-trong-nhiều dạng hàng dọc — dễ đọc, vùng chạm lớn, không bị tràn chữ. */
export function RadioGroup<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: RadioGroupProps<T>) {
  const { colors, spacing, radius, touch } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        overflow: 'hidden',
      }}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.label}
            accessibilityHint={option.description}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              minHeight: touch.primary + spacing.sm,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              backgroundColor: selected
                ? colors.primaryContainer
                : pressed
                  ? colors.surfaceVariant
                  : colors.surface,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: colors.border,
            })}
          >
            {option.icon ? (
              <AppIcon name={option.icon} color={selected ? 'onPrimaryContainer' : 'textSecondary'} />
            ) : null}
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label" color={selected ? 'onPrimaryContainer' : 'textPrimary'}>
                {option.label}
              </AppText>
              {option.description ? (
                <AppText
                  variant="bodySmall"
                  color={selected ? 'onPrimaryContainer' : 'textSecondary'}
                >
                  {option.description}
                </AppText>
              ) : null}
            </View>
            <AppIcon
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              color={selected ? 'primary' : 'textSecondary'}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
