import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Alert, View } from 'react-native';

import {
  AppIcon,
  AppText,
  Button,
  Card,
  RadioGroup,
  Screen,
  Section,
  SwitchRow,
} from '@/components/ui';
import { MEDICAL_DISCLAIMER } from '@/constants/disclaimer';
import { strings } from '@/constants/strings.vi';
import { useConsent } from '@/features/onboarding/ConsentProvider';
import { FamilySettingsSection } from '@/features/settings/FamilySettingsSection';
import { ReminderSettingsSection } from '@/features/settings/ReminderSettingsSection';
import { THEME_OPTIONS } from '@/features/settings/themeOptions';
import { useTheme } from '@/theme';
import { formatDateTime } from '@/utils/format';

const copy = strings.settings;

export default function SettingsScreen() {
  const router = useRouter();
  const { preference, setPreference, scheme, spacing, sickDayMode, setSickDayMode } = useTheme();
  const { acceptedAt, withdraw } = useConsent();
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';

  function handleSickDayChange(enabled: boolean) {
    setSickDayMode(enabled);
    // Khi bật: thanh tab bị ẩn → đưa người dùng về màn hình Hôm nay tối giản.
    if (enabled) router.navigate('/');
  }

  function confirmWithdraw() {
    Alert.alert(copy.withdrawConfirmTitle, copy.withdrawConfirmMessage, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: copy.withdrawConsent,
        style: 'destructive',
        onPress: () => {
          withdraw().catch((error: unknown) => {
            console.error('[settings] Không rút lại được sự đồng ý', error);
            Alert.alert(strings.common.errorTitle, copy.withdrawFailed);
          });
        },
      },
    ]);
  }

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

      <Section title={copy.sickDayTitle}>
        <SwitchRow
          icon="bed-outline"
          label={copy.sickDayLabel}
          description={copy.sickDayDescription}
          value={sickDayMode}
          onValueChange={handleSickDayChange}
        />
      </Section>

      <Section title={copy.medicationTitle}>
        <Button
          title={copy.openMedications}
          icon="medkit-outline"
          variant="outline"
          fullWidth
          onPress={() => router.push('/medications')}
        />
        <Button
          title={copy.openRoutine}
          icon="time-outline"
          variant="outline"
          fullWidth
          onPress={() => router.push('/routine')}
        />
      </Section>

      <ReminderSettingsSection />

      <FamilySettingsSection />

      <Section title={copy.privacyTitle}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppIcon name="lock-closed-outline" color="primary" />
            <AppText variant="label" style={{ flex: 1 }}>
              {copy.dataStaysOnDevice}
            </AppText>
          </View>
          {acceptedAt ? (
            <AppText variant="bodySmall" color="textSecondary">
              {copy.consentAcceptedAt(formatDateTime(acceptedAt))}
            </AppText>
          ) : null}
        </Card>
        <Button
          title={copy.withdrawConsent}
          icon="hand-left-outline"
          variant="outline"
          fullWidth
          onPress={confirmWithdraw}
        />
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
            fullWidth
            onPress={() => router.push('/design-preview')}
          />
          <Button
            title={copy.openDevData}
            icon="server-outline"
            variant="outline"
            fullWidth
            onPress={() => router.push('/dev-data')}
          />
        </Section>
      ) : null}
    </Screen>
  );
}
