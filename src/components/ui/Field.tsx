import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

export interface FieldProps {
  label: string;
  /** Gợi ý dưới ô nhập. */
  hint?: string;
  /** Lỗi (hiện chữ đỏ kèm icon — không chỉ dựa vào màu). */
  error?: string;
  children: ReactNode;
}

/** Khung chung cho ô nhập: nhãn ở trên, gợi ý / lỗi ở dưới. */
export function Field({ label, hint, error, children }: FieldProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="label">{label}</AppText>
      {children}
      {error ? (
        <View
          style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' }}
          accessibilityLiveRegion="polite"
        >
          <AppIcon name="alert-circle" color="danger" size={18} />
          <AppText variant="bodySmall" color="danger" style={{ flex: 1 }}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="bodySmall" color="textSecondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
