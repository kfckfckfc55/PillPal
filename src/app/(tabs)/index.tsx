import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText, Badge, Button, Card, EmptyState, Screen } from '@/components/ui';
import { MEDICAL_DISCLAIMER_SHORT } from '@/constants/disclaimer';
import { strings } from '@/constants/strings.vi';
import { useTheme } from '@/theme';

const copy = strings.placeholders.today;

export default function TodayScreen() {
  const router = useRouter();
  const { spacing } = useTheme();

  return (
    <Screen>
      <EmptyState icon="today-outline" title={copy.title} description={copy.description} />
      <View style={{ alignItems: 'center', gap: spacing.lg }}>
        <Badge
          tone="info"
          icon="construct-outline"
          label={strings.common.comingSoon(copy.milestone)}
          style={{ alignSelf: 'center' }}
        />
        <Button
          title={strings.settings.openDesignPreview}
          icon="color-palette-outline"
          variant="secondary"
          onPress={() => router.push('/design-preview')}
          style={{ alignSelf: 'center' }}
        />
      </View>
      <Card>
        <AppText variant="bodySmall" color="textSecondary">
          {MEDICAL_DISCLAIMER_SHORT}
        </AppText>
      </Card>
    </Screen>
  );
}
