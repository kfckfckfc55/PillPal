import { ActivityIndicator, View } from 'react-native';

import { strings } from '@/constants/strings.vi';
import { useTheme } from '@/theme';

import { AppText } from './AppText';

export interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = strings.common.loading }: LoadingStateProps) {
  const { colors, spacing } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      accessibilityLiveRegion="polite"
      style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText color="textSecondary" align="center">
        {message}
      </AppText>
    </View>
  );
}
