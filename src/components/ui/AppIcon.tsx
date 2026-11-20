import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTheme, type ColorTokenName } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface AppIconProps {
  name: IconName;
  /** Token màu (mặc định `textPrimary`). Dùng `rawColor` khi màu đã được tính sẵn. */
  color?: ColorTokenName;
  rawColor?: string;
  size?: number;
  /** Mặc định icon là trang trí (ẩn với trình đọc màn hình). Truyền label nếu icon mang nghĩa riêng. */
  accessibilityLabel?: string;
}

export function AppIcon({ name, color = 'textPrimary', rawColor, size, accessibilityLabel }: AppIconProps) {
  const { colors, sickDayMode } = useTheme();
  const resolvedSize = size ?? (sickDayMode ? 28 : 22);
  return (
    <Ionicons
      name={name}
      size={resolvedSize}
      color={rawColor ?? colors[color]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    />
  );
}
