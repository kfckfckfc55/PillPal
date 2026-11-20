import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppIcon, AppText, Button, Card, RadioGroup, Screen, Section } from '@/components/ui';
import { MEDICAL_DISCLAIMER } from '@/constants/disclaimer';
import { strings } from '@/constants/strings.vi';
import { THEME_OPTIONS } from '@/features/settings/themeOptions';
import { useTheme } from '@/theme';

const copy = strings.settings;

export default function SettingsScreen() {
  const router = useRouter();
  const { preference, setPreference, scheme, spacing } = useTheme();
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';

  return (
    <Screen>
      <Section title={copy.appearanceTitle} description={copy.appearanceDescription}>
        <RadioGroup
          options={THEME_OPTIONS}
          value={preference}
          onChange={setPreference}
          accessibilityLabel={copy.appearanceTitle}
        />
        <AppText variant="bodySmall" color="textSecondary" accessibilityLiveRegion="polite">
          {copy.currentlyShowing(copy.schemeLabels[scheme])}
        </AppText>
      </Section>

      <Section title={copy.aboutTitle}>
        <Card>
          <AppText variant="label">{strings.appName}</AppText>
          <AppText variant="bodySmall" color="textSecondary">
            {copy.version(appVersion)}
          </AppText>
        </Card>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppIcon name="shield-checkmark-outline" color="primary" />
            <AppText variant="label" style={{ flex: 1 }}>
              {copy.disclaimerTitle}
            </AppText>
          </View>
          <AppText variant="bodySmall" color="textSecondary">
            {MEDICAL_DISCLAIMER}
          </AppText>
        </Card>
      </Section>

      {__DEV__ ? (
        <Section title={copy.developerTitle}>
          <Button
            title={copy.openDesignPreview}
            icon="color-palette-outline"
            variant="outline"
            onPress={() => router.push('/design-preview')}
          />
        </Section>
      ) : null}
    </Screen>
  );
}
