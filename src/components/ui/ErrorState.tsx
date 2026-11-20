import { View } from 'react-native';

import { strings } from '@/constants/strings.vi';
import { useTheme } from '@/theme';

import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = strings.common.errorTitle,
  message = strings.common.errorMessage,
  onRetry,
}: ErrorStateProps) {
  const { spacing, sickDayMode } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}
    >
      <AppIcon name="alert-circle" color="danger" size={sickDayMode ? 48 : 40} />
      <AppText variant="title" align="center">
        {title}
      </AppText>
      <AppText color="textSecondary" align="center" style={{ maxWidth: 480 }}>
        {message}
      </AppText>
      {onRetry ? (
        <Button
          title={strings.common.retry}
          icon="refresh"
          variant="outline"
          onPress={onRetry}
          style={{ alignSelf: 'center' }}
        />
      ) : null}
    </View>
  );
}
