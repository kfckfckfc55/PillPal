import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme, type ColorTokens } from '@/theme';

import { AppIcon, type IconName } from './AppIcon';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  /** Kéo giãn hết chiều ngang vùng chứa. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

interface VariantColors {
  background: string;
  foreground: string;
  border: string;
}

function getVariantColors(variant: ButtonVariant, colors: ColorTokens): VariantColors {
  switch (variant) {
    case 'primary':
      return { background: colors.primary, foreground: colors.onPrimary, border: colors.primary };
    case 'secondary':
      return {
        background: colors.primaryContainer,
        foreground: colors.onPrimaryContainer,
        border: colors.primaryContainer,
      };
    case 'outline':
      return { background: 'transparent', foreground: colors.primary, border: colors.primary };
    case 'ghost':
      return { background: 'transparent', foreground: colors.primary, border: 'transparent' };
    case 'danger':
      return { background: colors.danger, foreground: colors.onStatus, border: colors.danger };
  }
}

export function Button({
  title,
  variant = 'primary',
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const { colors, spacing, radius, touch } = useTheme();
  const palette = getVariantColors(variant, colors);
  const isDisabled = Boolean(disabled) || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={4}
      {...rest}
      style={({ pressed }) => [
        {
          minHeight: touch.primary,
          minWidth: touch.min,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.sm,
          borderRadius: radius.pill,
          borderWidth: 1.5,
          borderColor: palette.border,
          backgroundColor: palette.background,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.foreground} />
      ) : icon ? (
        <AppIcon name={icon} rawColor={palette.foreground} />
      ) : null}
      <AppText variant="label" style={{ color: palette.foreground }} align="center">
        {title}
      </AppText>
    </Pressable>
  );
}
