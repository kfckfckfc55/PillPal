import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppIcon, type IconName } from './AppIcon';
import { AppText } from './AppText';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}

/** Trạng thái trống: luôn nói rõ chuyện gì đang xảy ra và người dùng nên làm gì tiếp. */
export function EmptyState({
  title,
  description,
  icon = 'file-tray-outline',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors, spacing, sickDayMode } = useTheme();
  const circle = sickDayMode ? 88 : 72;

  return (
    <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
      <View
        style={{
          width: circle,
          height: circle,
          borderRadius: circle / 2,
          backgroundColor: colors.primaryContainer,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name={icon} color="onPrimaryContainer" size={sickDayMode ? 40 : 32} />
      </View>
      <AppText variant="title" align="center">
        {title}
      </AppText>
      {description ? (
        <AppText color="textSecondary" align="center" style={{ maxWidth: 480 }}>
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} icon="add" onPress={onAction} style={{ alignSelf: 'center' }} />
      ) : null}
    </View>
  );
}
