import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme, type ColorTokenName, type TextVariant } from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  /** Token màu (mặc định `textPrimary`). */
  color?: ColorTokenName;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
}

const HEADER_VARIANTS: ReadonlySet<TextVariant> = new Set(['display', 'title']);

/** Chữ dùng chung: luôn lấy cỡ chữ & màu từ theme (tự phóng to khi bật Sick-Day Mode). */
export function AppText({
  variant = 'body',
  color = 'textPrimary',
  align,
  weight,
  style,
  accessibilityRole,
  ...rest
}: AppTextProps) {
  const { colors, typography } = useTheme();
  const scale = typography[variant];

  return (
    <Text
      accessibilityRole={accessibilityRole ?? (HEADER_VARIANTS.has(variant) ? 'header' : undefined)}
      {...rest}
      style={[
        {
          color: colors[color],
          fontSize: scale.fontSize,
          lineHeight: scale.lineHeight,
          fontWeight: weight ?? scale.fontWeight,
          textAlign: align,
        },
        style,
      ]}
    />
  );
}
