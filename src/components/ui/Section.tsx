import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

export interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** Nhóm nội dung có tiêu đề (dùng trong Cài đặt, màn hình chi tiết…). */
export function Section({ title, description, children }: SectionProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="subtitle" accessibilityRole="header">
          {title}
        </AppText>
        {description ? (
          <AppText variant="bodySmall" color="textSecondary">
            {description}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}
