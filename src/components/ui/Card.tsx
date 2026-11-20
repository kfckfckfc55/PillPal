import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface CardProps {
  children: ReactNode;
  /** `highlight` dùng nền primaryContainer cho thẻ cần nổi bật. */
  variant?: 'default' | 'highlight';
  /** Có onPress → thẻ bấm được (vai trò button cho trình đọc màn hình). */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  variant = 'default',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: CardProps) {
  const { colors, spacing, radius } = useTheme();

  const baseStyle: ViewStyle = {
    backgroundColor: variant === 'highlight' ? colors.primaryContainer : colors.surface,
    borderColor: variant === 'highlight' ? colors.primaryContainer : colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  };

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        style={({ pressed }) => [baseStyle, { opacity: pressed ? 0.85 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={[baseStyle, style]}>
      {children}
    </View>
  );
}
